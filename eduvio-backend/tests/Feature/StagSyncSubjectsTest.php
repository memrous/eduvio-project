<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StagSyncSubjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_sync_subjects(): void
    {
        $response = $this->postJson('/api/stag/sync-subjects', []);
        $response->assertStatus(401);
    }

    public function test_validation_fails_on_invalid_data(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            [
                'code' => '', // required
                'name' => 'Test Subject',
                // credits missing
                'semester' => 'ZS',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['0.code', '0.credits']);
    }

    public function test_sync_subjects_creates_new_subjects_with_fallbacks(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            [
                'code' => 'KIV/PRO',
                'name' => 'Programování',
                'credits' => 5,
                'semester' => 'ZS',
                // completionType, isMandatory, lecturer omitted -> should use fallbacks
            ],
            [
                'code' => 'KIV/DB',
                'name' => 'Databázové systémy',
                'credits' => 6,
                'semester' => 'LS',
                'completionType' => 'Exam',
                'isMandatory' => false,
                'lecturer' => 'Doc. Jan Novák',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Sync successful. 2 subjects processed.',
            ]);

        $this->assertDatabaseHas('subjects', [
            'user_id'         => $user->id,
            'code'            => 'KIV/PRO',
            'name'            => 'Programování',
            'credits'         => 5,
            'semester'        => 'ZS',
            'completion_type' => 'Credit',
            'is_mandatory'    => true,
            'lecturer'        => 'Nespecifikováno',
            'description'     => 'Imported from IS/STAG',
        ]);

        $this->assertDatabaseHas('subjects', [
            'user_id'         => $user->id,
            'code'            => 'KIV/DB',
            'name'            => 'Databázové systémy',
            'credits'         => 6,
            'semester'        => 'LS',
            'completion_type' => 'Exam',
            'is_mandatory'    => false,
            'lecturer'        => 'Doc. Jan Novák',
            'description'     => 'Imported from IS/STAG',
        ]);
    }

    public function test_resync_updates_fields_without_overwriting_custom_description(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Pre-create subject with custom user description
        $subject = Subject::create([
            'user_id'         => $user->id,
            'code'            => 'KIV/PRO',
            'name'            => 'Původní Název',
            'credits'         => 4,
            'semester'        => 'ZS',
            'completion_type' => 'Credit',
            'is_mandatory'    => true,
            'lecturer'        => 'Původní Vyučující',
            'description'     => 'Moje osobní poznámka k předmětu',
        ]);

        $payload = [
            [
                'code'           => 'KIV/PRO',
                'name'           => 'Aktualizované Programování',
                'credits'        => 5,
                'semester'       => 'ZS',
                'completionType' => 'Exam',
                'isMandatory'    => true,
                'lecturer'       => 'Nový Přednášející',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Sync successful. 1 subjects processed.',
            ]);

        // Verify updated fields
        $subject->refresh();
        $this->assertEquals('Aktualizované Programování', $subject->name);
        $this->assertEquals(5, $subject->credits);
        $this->assertEquals('Exam', $subject->completion_type);
        $this->assertEquals('Nový Přednášející', $subject->lecturer);

        // Verify description was NOT overwritten
        $this->assertEquals('Moje osobní poznámka k předmětu', $subject->description);

        // Ensure no duplicate subject was created
        $this->assertEquals(1, Subject::where('user_id', $user->id)->where('code', 'KIV/PRO')->count());
    }
}
