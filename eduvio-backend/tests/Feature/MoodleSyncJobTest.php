<?php

namespace Tests\Feature;

use App\Jobs\MoodleSyncJob;
use App\Models\Requirement;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MoodleSyncJobTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'secret-wstoken-123';

    /** Course ids requested from mod_assign_get_assignments in the last run. */
    private array $requestedCourseIds = [];

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name'           => 'John Doe',
            'username'       => 'johndoe',
            'email'          => 'john@example.com',
            'password'       => 'password123',
            'moodle_wstoken' => self::TOKEN,
            'moodle_user_id' => 42,
        ], $overrides));
    }

    private function createSubject(User $user, string $code, ?string $department): Subject
    {
        return Subject::create([
            'user_id'    => $user->id,
            'code'       => $code,
            'name'       => "Subject {$code}",
            'credits'    => 5,
            'lecturer'   => 'Dr. Smith',
            'department' => $department,
            'semester'   => 'ZS 2026',
        ]);
    }

    private function dueTimestamp(): int
    {
        return Carbon::create(2026, 10, 15, 23, 59, 0, 'Europe/Prague')->timestamp;
    }

    /**
     * Fake Moodle WS. $courses is the enrolment list; $assignmentsByCourse maps
     * course id => assignments returned by mod_assign_get_assignments.
     */
    private function fakeMoodle(
        array $courses,
        array $assignmentsByCourse,
        array $submittedIds = [],
        array $failingStatusIds = [],
    ): void {
        // Http::fake() appends to existing stubs; start from a clean factory so a re-fake replaces them.
        Http::swap(new HttpFactory());

        Http::fake(function (Request $request) use ($courses, $assignmentsByCourse, $submittedIds, $failingStatusIds) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            return match ($query['wsfunction'] ?? null) {
                'core_enrol_get_users_courses' => Http::response($courses),
                'mod_assign_get_assignments'   => Http::response([
                    'courses' => collect($this->requestedCourseIds = array_map('intval', $query['courseids'] ?? []))
                        ->map(fn ($id) => ['id' => $id, 'assignments' => $assignmentsByCourse[$id] ?? []])
                        ->all(),
                    'warnings' => [],
                ]),
                'mod_assign_get_submission_status' => in_array((int) $query['assignid'], $failingStatusIds, true)
                    ? Http::response(['exception' => 'required_capability_exception', 'errorcode' => 'nopermissions', 'message' => 'No permission'])
                    : Http::response([
                        'lastattempt' => [
                            'submission' => [
                                'status' => in_array((int) $query['assignid'], $submittedIds, true) ? 'submitted' : 'new',
                            ],
                        ],
                    ]),
                default => Http::response(['exception' => 'moodle_exception', 'errorcode' => 'unknown'], 200),
            };
        });
    }

    private function standardFixture(): void
    {
        $this->fakeMoodle(
            [
                ['id' => 10, 'shortname' => '2026-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'Matematická analýza'],
            ],
            [
                10 => [
                    ['id' => 100, 'name' => 'Úkol 1', 'duedate' => $this->dueTimestamp(), 'grade' => 20],
                    ['id' => 101, 'name' => 'Úkol 2', 'duedate' => 0, 'grade' => -5],
                ],
            ],
            submittedIds: [100],
        );
    }

    public function test_successful_sync_creates_requirements_for_matched_subject(): void
    {
        $user = $this->createUser();
        $other = $this->createSubject($user, 'MR', 'KMA');
        $subject = $this->createSubject($user, 'MR', 'KAG');
        $this->standardFixture();

        MoodleSyncJob::dispatchSync($user);

        $user->refresh();
        $this->assertSame('success', $user->moodle_sync_status);
        $this->assertNotNull($user->moodle_synced_at);

        $this->assertSame(0, $other->requirements()->count());
        $this->assertSame(2, $subject->requirements()->count());

        $first = Requirement::where('moodle_assignment_id', 100)->firstOrFail();
        $this->assertSame('Úkol 1', $first->title);
        $this->assertSame('homework', $first->type);
        $this->assertSame('2026-10-15', $first->due_date);
        $this->assertSame('23:59', $first->due_time);
        $this->assertSame(20, $first->max_points);
        $this->assertTrue($first->completed);
        $this->assertSame('Moodle: Matematická analýza', $first->context);

        $second = Requirement::where('moodle_assignment_id', 101)->firstOrFail();
        $this->assertNull($second->due_date);
        $this->assertNull($second->due_time);
        $this->assertNull($second->max_points);
        $this->assertFalse($second->completed);

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/webservice/rest/server.php')
            && str_contains($r->url(), 'courseids%5B0%5D=10'));
    }

    public function test_second_run_does_not_create_duplicates_and_keeps_user_fields(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user, 'MR', 'KAG');
        $this->standardFixture();

        MoodleSyncJob::dispatchSync($user);

        Requirement::where('moodle_assignment_id', 100)->update(['gained_points' => 15, 'grade' => 'A', 'weight' => 30]);

        MoodleSyncJob::dispatchSync($user->fresh());

        $this->assertSame(2, $subject->requirements()->count());

        $first = Requirement::where('moodle_assignment_id', 100)->firstOrFail();
        $this->assertSame(15, $first->gained_points);
        $this->assertSame('A', $first->grade);
        $this->assertSame(30, $first->weight);
    }

    public function test_failed_submission_status_keeps_existing_completed_and_defaults_new_to_false(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user, 'MR', 'KAG');
        $courses = [['id' => 10, 'shortname' => '2026-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'Matematická analýza']];

        $this->fakeMoodle($courses, [
            10 => [['id' => 100, 'name' => 'Úkol 1', 'duedate' => 0, 'grade' => 20]],
        ], submittedIds: [100]);

        MoodleSyncJob::dispatchSync($user);

        $this->assertTrue(Requirement::where('moodle_assignment_id', 100)->firstOrFail()->completed);

        // Second run: status lookup fails for both the existing and a newly added assignment.
        $this->fakeMoodle($courses, [
            10 => [
                ['id' => 100, 'name' => 'Úkol 1 (upraveno)', 'duedate' => 0, 'grade' => 20],
                ['id' => 102, 'name' => 'Úkol 3', 'duedate' => 0, 'grade' => 10],
            ],
        ], failingStatusIds: [100, 102]);

        MoodleSyncJob::dispatchSync($user->fresh());

        $this->assertSame('success', $user->fresh()->moodle_sync_status);
        $this->assertSame(2, $subject->requirements()->count());

        $existing = Requirement::where('moodle_assignment_id', 100)->firstOrFail();
        $this->assertTrue($existing->completed);
        $this->assertSame('Úkol 1 (upraveno)', $existing->title);

        $new = Requirement::where('moodle_assignment_id', 102)->firstOrFail();
        $this->assertFalse($new->completed);
    }

    public function test_course_with_unparseable_shortname_is_skipped(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user, 'MR', 'KAG');
        $this->fakeMoodle(
            [
                ['id' => 10, 'shortname' => '2026-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'Matematická analýza'],
                ['id' => 11, 'shortname' => 'Sandbox kurz', 'fullname' => 'Sandbox'],
                ['id' => 12, 'shortname' => '2026-ZS-KAG/NEZNAMY-Prezenční-ZS-', 'fullname' => 'Neznámý předmět'],
            ],
            [
                10 => [['id' => 100, 'name' => 'Úkol 1', 'duedate' => 0, 'grade' => 10]],
                11 => [['id' => 110, 'name' => 'Sandbox úkol', 'duedate' => 0, 'grade' => 10]],
                12 => [['id' => 120, 'name' => 'Cizí úkol', 'duedate' => 0, 'grade' => 10]],
            ],
        );

        MoodleSyncJob::dispatchSync($user);

        $this->assertSame('success', $user->fresh()->moodle_sync_status);
        $this->assertSame([10], $this->requestedCourseIds);
        $this->assertSame(1, Requirement::count());
        $this->assertSame(1, $subject->requirements()->count());
    }

    public function test_only_newest_semester_course_is_used_for_same_subject(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user, 'MR', 'KAG');
        $this->fakeMoodle(
            [
                ['id' => 9, 'shortname' => '2025-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'MR 2025'],
                ['id' => 10, 'shortname' => '2026-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'MR 2026'],
            ],
            [
                9  => [['id' => 90, 'name' => 'Starý úkol', 'duedate' => 0, 'grade' => 10]],
                10 => [['id' => 100, 'name' => 'Nový úkol', 'duedate' => 0, 'grade' => 10]],
            ],
        );

        MoodleSyncJob::dispatchSync($user);

        $this->assertSame([10], $this->requestedCourseIds);
        $this->assertSame(['Nový úkol'], $subject->requirements()->pluck('title')->all());
        $this->assertSame('Moodle: MR 2026', $subject->requirements()->first()->context);
    }

    public function test_invalid_token_marks_sync_failed_with_reconnect_message(): void
    {
        $user = $this->createUser();
        $this->createSubject($user, 'MR', 'KAG');
        Http::fake([
            '*' => Http::response([
                'exception' => 'moodle_exception',
                'errorcode' => 'invalidtoken',
                'message'   => 'Invalid token - token not found',
            ], 200),
        ]);

        MoodleSyncJob::dispatchSync($user);

        $user->refresh();
        $this->assertSame('failed', $user->moodle_sync_status);
        $this->assertSame('Moodle token expired or revoked, please reconnect.', $user->moodle_sync_error);
        $this->assertSame(0, Requirement::count());
    }

    public function test_missing_moodle_user_id_marks_sync_failed(): void
    {
        $user = $this->createUser(['moodle_user_id' => null]);
        Http::fake();

        MoodleSyncJob::dispatchSync($user);

        $user->refresh();
        $this->assertSame('failed', $user->moodle_sync_status);
        $this->assertSame('Moodle user id missing, please reconnect.', $user->moodle_sync_error);
        Http::assertNothingSent();
    }

    public function test_connection_error_does_not_leak_token(): void
    {
        $user = $this->createUser();
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException(
            'cURL error 28 for https://moodle.test/webservice/rest/server.php?wstoken=' . self::TOKEN
        ));

        MoodleSyncJob::dispatchSync($user);

        $user->refresh();
        $this->assertSame('failed', $user->moodle_sync_status);
        $this->assertStringNotContainsString(self::TOKEN, $user->moodle_sync_error);
        $this->assertStringNotContainsString('server.php', $user->moodle_sync_error);
    }
}
