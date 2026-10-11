<?php

namespace Tests\Feature;

use App\Models\ExamTerm;
use App\Models\ExamTopic;
use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Exam section of the subject detail: STAG terms, the topic checklist and
 * materials marked for the exam.
 */
class ExamPreparationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->subject = $this->makeSubject($this->user, 'STRUP');
    }

    private function makeSubject(User $user, string $code): Subject
    {
        return Subject::create([
            'user_id'         => $user->id,
            'code'            => $code,
            'name'            => "Předmět {$code}",
            'credits'         => 5,
            'lecturer'        => 'Jan Outrata',
            'completion_type' => 'Exam',
            'is_mandatory'    => true,
            'semester'        => 'ZS 2026',
        ]);
    }

    private function term(array $overrides = []): array
    {
        return array_merge([
            'stagId'                 => '1001',
            'subjectCode'            => 'STRUP',
            'date'                   => '2027-01-20',
            'startTime'              => '9:00',
            'endTime'                => '11:00',
            'kind'                   => 'exam',
            'room'                   => 'BUF 3.04',
            'examiner'               => 'Mgr. Jan Outrata, Ph.D.',
            'registered'             => true,
            'capacity'               => 30,
            'occupied'               => 12,
            'deregistrationDeadline' => '2027-01-18',
            'note'                   => 'Písemná část',
        ], $overrides);
    }

    private function syncTerms(array $terms): TestResponse
    {
        Sanctum::actingAs($this->user, ['stag:sync']);

        return $this->postJson('/api/stag/sync-exam-terms', $terms);
    }

    // ── Terms ────────────────────────────────────────────────────

    public function test_sync_stores_terms_of_known_subjects_and_skips_unknown(): void
    {
        $response = $this->syncTerms([
            $this->term(),
            $this->term(['stagId' => '1002', 'subjectCode' => 'NEZNAM']),
        ]);

        $response->assertOk()->assertJson(['saved' => 1, 'skipped' => 1, 'deleted' => 0]);

        $term = ExamTerm::sole();
        $this->assertSame($this->subject->id, $term->subject_id);
        $this->assertSame('09:00', $term->start_time);
        $this->assertTrue($term->is_registered);
        $this->assertSame('2027-01-18', $term->deregistration_deadline->format('Y-m-d'));
    }

    public function test_sync_updates_existing_terms_and_removes_missing_ones(): void
    {
        $this->syncTerms([$this->term(), $this->term(['stagId' => '1002', 'date' => '2027-01-27'])]);

        $this->syncTerms([$this->term(['registered' => false, 'occupied' => 13])])
            ->assertOk()
            ->assertJson(['saved' => 1, 'deleted' => 1]);

        $term = ExamTerm::sole();
        $this->assertSame('1001', $term->stag_id);
        $this->assertFalse($term->is_registered);
        $this->assertSame(13, $term->occupied);
    }

    public function test_empty_sync_removes_all_terms_of_the_user_only(): void
    {
        $other = User::factory()->create();
        $otherSubject = $this->makeSubject($other, 'STRUP');
        ExamTerm::create([
            'user_id' => $other->id, 'subject_id' => $otherSubject->id, 'stag_id' => '1001',
            'date' => '2027-01-20', 'kind' => 'exam',
        ]);
        $this->syncTerms([$this->term()]);

        $this->syncTerms([])->assertOk()->assertJson(['deleted' => 1]);

        $this->assertSame(0, ExamTerm::where('user_id', $this->user->id)->count());
        $this->assertSame(1, ExamTerm::where('user_id', $other->id)->count());
    }

    public function test_sync_validates_terms(): void
    {
        $this->syncTerms([$this->term(['date' => '20.1.2027'])])->assertStatus(422);
        $this->syncTerms([$this->term(['kind' => 'party'])])->assertStatus(422);
        $this->syncTerms([$this->term(['startTime' => '9h'])])->assertStatus(422);
    }

    public function test_agent_token_can_sync_terms_but_not_read_them(): void
    {
        $agentToken = $this->user->createToken(User::STAG_AGENT_TOKEN, ['stag:sync'])->plainTextToken;

        $this->withToken($agentToken)
            ->postJson('/api/stag/sync-exam-terms', [$this->term()])
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($agentToken)
            ->getJson("/api/subjects/{$this->subject->id}/exam-terms")
            ->assertForbidden();
    }

    public function test_terms_are_listed_by_date_for_the_owner_only(): void
    {
        $this->syncTerms([
            $this->term(['stagId' => '2', 'date' => '2027-02-03']),
            $this->term(['stagId' => '1', 'date' => '2027-01-20']),
        ]);

        Sanctum::actingAs($this->user, ['*']);
        $this->getJson("/api/subjects/{$this->subject->id}/exam-terms")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.date', '2027-01-20')
            ->assertJsonPath('0.is_registered', true)
            ->assertJsonMissingPath('0.user_id');

        Sanctum::actingAs(User::factory()->create(), ['*']);
        $this->getJson("/api/subjects/{$this->subject->id}/exam-terms")->assertNotFound();
    }

    // ── Topics ───────────────────────────────────────────────────

    public function test_topics_can_be_added_checked_renamed_and_deleted(): void
    {
        Sanctum::actingAs($this->user, ['*']);
        $base = "/api/subjects/{$this->subject->id}/exam-topics";

        $this->postJson($base, ['titles' => ['  Rekurze ', '', 'Ukazatele   a pole']])
            ->assertCreated()
            ->assertJsonCount(2)
            ->assertJsonPath('0.title', 'Rekurze')
            ->assertJsonPath('1.title', 'Ukazatele a pole');
        $this->postJson($base, ['titles' => ['Třídění']])->assertCreated();

        $titles = $this->getJson($base)->assertOk()->json('*.title');
        $this->assertSame(['Rekurze', 'Ukazatele a pole', 'Třídění'], $titles);

        $topic = ExamTopic::where('title', 'Rekurze')->sole();
        $this->patchJson("/api/exam-topics/{$topic->id}", ['is_done' => true])
            ->assertOk()
            ->assertJsonPath('is_done', true);
        $this->patchJson("/api/exam-topics/{$topic->id}", ['title' => 'Rekurze a zásobník'])
            ->assertOk()
            ->assertJsonPath('title', 'Rekurze a zásobník')
            ->assertJsonPath('is_done', true);

        $this->deleteJson("/api/exam-topics/{$topic->id}")->assertOk();
        $this->assertSame(2, $this->subject->examTopics()->count());
    }

    public function test_topic_validation(): void
    {
        Sanctum::actingAs($this->user, ['*']);
        $base = "/api/subjects/{$this->subject->id}/exam-topics";

        $this->postJson($base, ['titles' => []])->assertStatus(422);
        $this->postJson($base, ['titles' => ['   ']])->assertStatus(422);
        $this->postJson($base, ['titles' => [str_repeat('x', 501)]])->assertStatus(422);

        $topic = $this->subject->examTopics()->create(['title' => 'Grafy', 'position' => 1]);
        $this->patchJson("/api/exam-topics/{$topic->id}", ['title' => '  '])->assertStatus(422);
        $this->patchJson("/api/exam-topics/{$topic->id}", ['is_done' => 'možná'])->assertStatus(422);
    }

    public function test_topics_of_another_user_are_not_found(): void
    {
        $topic = $this->subject->examTopics()->create(['title' => 'Grafy', 'position' => 1]);
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson("/api/subjects/{$this->subject->id}/exam-topics")->assertNotFound();
        $this->postJson("/api/subjects/{$this->subject->id}/exam-topics", ['titles' => ['X']])->assertNotFound();
        $this->patchJson("/api/exam-topics/{$topic->id}", ['is_done' => true])->assertNotFound();
        $this->deleteJson("/api/exam-topics/{$topic->id}")->assertNotFound();
        $this->assertFalse($topic->fresh()->is_done);
    }

    public function test_deleting_the_subject_removes_its_topics_and_terms(): void
    {
        $this->subject->examTopics()->create(['title' => 'Grafy', 'position' => 1]);
        $this->syncTerms([$this->term()]);

        $this->subject->delete();

        $this->assertSame(0, ExamTopic::count());
        $this->assertSame(0, ExamTerm::count());
    }

    // ── Materials for the exam ───────────────────────────────────

    public function test_any_material_can_be_marked_for_the_exam(): void
    {
        $moodle = Material::create([
            'user_id'     => $this->user->id,
            'subject_id'  => $this->subject->id,
            'title'       => 'Okruhy ke zkoušce',
            'type'        => 'PDF',
            'url'         => 'https://moodle.example.org/file.pdf',
            'category'    => 'file',
            'moodle_cmid' => 77,
        ]);
        Sanctum::actingAs($this->user, ['*']);

        $this->postJson("/api/materials/{$moodle->id}/for-exam")
            ->assertOk()
            ->assertJsonPath('for_exam', true);
        $this->deleteJson("/api/materials/{$moodle->id}/for-exam")
            ->assertOk()
            ->assertJsonPath('for_exam', false);

        Sanctum::actingAs(User::factory()->create(), ['*']);
        $this->postJson("/api/materials/{$moodle->id}/for-exam")->assertNotFound();
    }
}
