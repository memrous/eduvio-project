<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StudyProgressTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // ZS 2026 is the current semester (October 2026)
        $this->travelTo('2026-10-07 12:00:00');
    }

    private function subject(User $user, array $attrs): Subject
    {
        static $n = 0;
        $n++;

        return Subject::create(array_merge([
            'user_id'         => $user->id,
            'code'            => "KMI/S{$n}",
            'name'            => "Předmět {$n}",
            'credits'         => 5,
            'lecturer'        => 'Nespecifikováno',
            'semester'        => 'ZS 2026',
            'completion_type' => 'Credit + Exam',
            'is_mandatory'    => true,
            'status'          => 'in_progress',
        ], $attrs));
    }

    public function test_requires_full_authentication(): void
    {
        $this->getJson('/api/user/study-progress')->assertStatus(401);
    }

    public function test_agent_token_cannot_read_progress(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken(User::STAG_AGENT_TOKEN, ['stag:sync'])->plainTextToken;

        $this->withToken($token)->getJson('/api/user/study-progress')->assertStatus(403);
    }

    public function test_empty_state(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson('/api/user/study-progress')
            ->assertStatus(200)
            ->assertExactJson([
                'earned_credits'             => 0,
                'completed_subjects'         => 0,
                'weighted_average'           => null,
                'required_credits'           => null,
                'required_credits_estimated' => true,
                'current_semester'           => 'ZS 2026',
                'current_semester_credits'   => 0,
            ]);
    }

    public function test_progress_from_subjects(): void
    {
        $user = User::factory()->create(['study_type' => 'B']);
        $other = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        // Completed with grades: 1 (6 cr), B = 1.5 (4 cr), 3 (5 cr), credit-only without grade (2 cr)
        $this->subject($user, ['credits' => 6, 'status' => 'completed', 'final_grade' => '1', 'semester' => 'LS 2025']);
        $this->subject($user, ['credits' => 4, 'status' => 'completed', 'final_grade' => 'B', 'semester' => 'LS 2025']);
        $this->subject($user, ['credits' => 5, 'status' => 'completed', 'final_grade' => '3', 'semester' => 'ZS 2025']);
        $this->subject($user, ['credits' => 2, 'status' => 'completed', 'final_grade' => null, 'completion_type' => 'Credit', 'semester' => 'ZS 2025']);
        // Failed with 4 counts into the average, not into earned credits
        $this->subject($user, ['credits' => 5, 'status' => 'failed', 'final_grade' => '4', 'semester' => 'ZS 2025']);
        // Current semester: in progress (STAG and manual), one removed from STAG
        $this->subject($user, ['credits' => 6, 'semester' => 'ZS 2026']);
        $this->subject($user, ['credits' => 3, 'semester' => 'ZS 2026/2027', 'source' => 'manual']);
        $this->subject($user, ['credits' => 4, 'semester' => 'ZS 2026', 'stag_removed_at' => now()]);
        // Another user's subject is ignored
        $this->subject($other, ['credits' => 30, 'status' => 'completed', 'final_grade' => '1']);

        // (1*6 + 1.5*4 + 3*5 + 4*5) / 20 = 47 / 20 = 2.35
        $this->getJson('/api/user/study-progress')
            ->assertStatus(200)
            ->assertJson([
                'earned_credits'             => 17,
                'completed_subjects'         => 4,
                'weighted_average'           => 2.35,
                'required_credits'           => 180,
                'required_credits_estimated' => true,
                'current_semester'           => 'ZS 2026',
                'current_semester_credits'   => 9,
            ]);
    }

    public function test_non_grades_are_excluded_from_average(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->subject($user, ['credits' => 4, 'status' => 'completed', 'final_grade' => '2,5']);
        $this->subject($user, ['credits' => 4, 'status' => 'completed', 'final_grade' => 'Z']);
        $this->subject($user, ['credits' => 4, 'status' => 'completed', 'final_grade' => 'Nedostavil se']);
        $this->subject($user, ['credits' => 0, 'status' => 'completed', 'final_grade' => '1']);

        $this->getJson('/api/user/study-progress')
            ->assertStatus(200)
            ->assertJsonPath('weighted_average', 2.5)
            ->assertJsonPath('completed_subjects', 4)
            ->assertJsonPath('earned_credits', 12);
    }

    #[DataProvider('studyTypeProvider')]
    public function test_required_credits_from_study_type(?string $studyType, ?int $expected): void
    {
        Sanctum::actingAs(User::factory()->create(['study_type' => $studyType]), ['*']);

        $this->getJson('/api/user/study-progress')
            ->assertStatus(200)
            ->assertJsonPath('required_credits', $expected);
    }

    public static function studyTypeProvider(): array
    {
        return [
            'bachelor code'          => ['B', 180],
            'follow-up master code'  => ['N', 120],
            'long master code'       => ['M', 300],
            'doctoral code'          => ['P', null],
            'bachelor name'          => ['Bakalářský', 180],
            'follow-up master name'  => ['Navazující magisterský', 120],
            'master name'            => ['Magisterský', 300],
            'unknown'                => [null, null],
        ];
    }

    public function test_current_semester_in_summer(): void
    {
        $this->travelTo('2027-03-01 12:00:00');
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->subject($user, ['credits' => 5, 'semester' => 'LS 2026']);
        $this->subject($user, ['credits' => 6, 'semester' => 'ZS 2026']);

        $this->getJson('/api/user/study-progress')
            ->assertJsonPath('current_semester', 'LS 2026')
            ->assertJsonPath('current_semester_credits', 5);
    }
}
