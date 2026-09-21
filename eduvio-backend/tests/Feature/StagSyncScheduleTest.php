<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StagSyncScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_sync_schedule(): void
    {
        $response = $this->postJson('/api/stag/sync-schedule', []);
        $response->assertStatus(401);
    }

    public function test_sync_schedule_creates_new_subject_and_event_with_department(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            [
                'subject' => [
                    'code' => 'KMI/ZP1',
                    'name' => 'Základy programování 1',
                    'credits' => 5,
                    'department' => 'KMI',
                    'lecturer' => 'RNDr. Jan Vývojář, Ph.D.',
                    'semester' => 'ZS 2026',
                    'completionType' => 'Exam',
                    'isMandatory' => true,
                ],
                'event' => [
                    'title' => 'Základy programování 1 (Přednáška)',
                    'date' => '2026-10-05',
                    'startTime' => '08:00',
                    'endTime' => '09:30',
                    'type' => 'Přednáška',
                    'room' => 'LP 5.001',
                    'teacherName' => 'RNDr. Jan Vývojář, Ph.D.',
                ],
            ],
        ];

        $response = $this->postJson('/api/stag/sync-schedule', $payload);
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Sync successful. 1 new schedule events were created.',
            ]);

        $this->assertDatabaseHas('subjects', [
            'user_id' => $user->id,
            'code' => 'KMI/ZP1',
            'department' => 'KMI',
            'lecturer' => 'RNDr. Jan Vývojář, Ph.D.',
        ]);

        $this->assertDatabaseHas('events', [
            'title' => 'Základy programování 1 (Přednáška)',
            'date' => '2026-10-05',
            'time' => '08:00',
        ]);
    }

    public function test_sync_schedule_updates_existing_subject_placeholders(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Subject exists with placeholder lecturer and no department
        $subject = Subject::create([
            'user_id' => $user->id,
            'code' => 'KMI/ZP1',
            'name' => 'Základy programování 1',
            'credits' => 5,
            'lecturer' => 'Nespecifikováno',
            'department' => null,
            'semester' => 'ZS 2026',
            'completion_type' => 'Credit',
            'is_mandatory' => true,
            'description' => 'Created earlier from subject sync',
        ]);

        $payload = [
            [
                'subject' => [
                    'code' => 'KMI/ZP1',
                    'name' => 'Základy programování 1',
                    'credits' => 5,
                    'department' => 'KMI',
                    'lecturer' => 'Doc. RNDr. Pavel Chytrý, CSc.',
                    'semester' => 'ZS 2026',
                    'completionType' => 'Credit',
                    'isMandatory' => true,
                ],
                'event' => [
                    'title' => 'Základy programování 1 (Seminář)',
                    'date' => '2026-10-06',
                    'startTime' => '10:00',
                    'endTime' => '11:30',
                    'type' => 'Seminář',
                    'room' => 'LP 5.002',
                    'teacherName' => 'Doc. RNDr. Pavel Chytrý, CSc.',
                ],
            ],
        ];

        $response = $this->postJson('/api/stag/sync-schedule', $payload);
        $response->assertStatus(200);

        $subject->refresh();
        $this->assertEquals('Doc. RNDr. Pavel Chytrý, CSc.', $subject->lecturer);
        $this->assertEquals('KMI', $subject->department);
        $this->assertEquals('Created earlier from subject sync', $subject->description);
    }

    public function test_sync_schedule_does_not_overwrite_valid_lecturer_with_nespecifikovano(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $subject = Subject::create([
            'user_id' => $user->id,
            'code' => 'KMI/ZP1',
            'name' => 'Základy programování 1',
            'credits' => 5,
            'lecturer' => 'Původní Skutečný Vyučující',
            'department' => 'KMI',
            'semester' => 'ZS 2026',
            'completion_type' => 'Credit',
            'is_mandatory' => true,
        ]);

        $payload = [
            [
                'subject' => [
                    'code' => 'KMI/ZP1',
                    'name' => 'Základy programování 1',
                    'credits' => 5,
                    'department' => 'KMI',
                    'lecturer' => 'Nespecifikováno',
                    'semester' => 'ZS 2026',
                    'completionType' => 'Credit',
                    'isMandatory' => true,
                ],
                'event' => [
                    'title' => 'Základy programování 1 (Přednáška)',
                    'date' => '2026-10-07',
                    'startTime' => '14:00',
                    'endTime' => '15:30',
                    'type' => 'Přednáška',
                ],
            ],
        ];

        $response = $this->postJson('/api/stag/sync-schedule', $payload);
        $response->assertStatus(200);

        $subject->refresh();
        $this->assertEquals('Původní Skutečný Vyučující', $subject->lecturer);
    }
    public function test_sync_schedule_saves_statut_and_derives_is_mandatory(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            [
                'subject' => [
                    'code' => 'KMI/PV1',
                    'name' => 'Povinně volitelný',
                    'credits' => 4,
                    'department' => 'KMI',
                    'lecturer' => 'Dr. Test',
                    'semester' => 'ZS 2026',
                    'completionType' => 'Credit',
                    'statut' => 'B',
                ],
                'event' => [
                    'title' => 'Cvičení',
                    'date' => '2026-10-10',
                    'startTime' => '10:00',
                    'type' => 'Cvičení',
                ],
            ],
        ];

        $response = $this->postJson('/api/stag/sync-schedule', $payload);
        $response->assertStatus(200);

        $this->assertDatabaseHas('subjects', [
            'user_id' => $user->id,
            'code' => 'KMI/PV1',
            'statut' => 'B',
            'is_mandatory' => false,
        ]);
    }
}
