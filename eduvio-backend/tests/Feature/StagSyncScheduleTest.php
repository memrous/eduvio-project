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
        Sanctum::actingAs($user, ['*']);

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
        Sanctum::actingAs($user, ['*']);

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
        Sanctum::actingAs($user, ['*']);

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
        Sanctum::actingAs($user, ['*']);

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

    private function scheduleItem(string $date, string $startTime, array $event = []): array
    {
        return [
            'subject' => [
                'code' => 'KMI/ZP1',
                'name' => 'Základy programování 1',
                'credits' => 5,
                'department' => 'KMI',
                'lecturer' => 'RNDr. Jan Vývojář, Ph.D.',
                'semester' => 'ZS 2026',
            ],
            'event' => array_merge([
                'title' => 'Základy programování 1 (Přednáška)',
                'date' => $date,
                'startTime' => $startTime,
                'endTime' => '09:30',
                'type' => 'Přednáška',
                'room' => 'LP 5.001',
                'teacherName' => 'RNDr. Jan Vývojář, Ph.D.',
            ], $event),
        ];
    }

    public function test_synced_events_are_marked_as_stag(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-schedule', [$this->scheduleItem('2026-10-05', '08:00')])
            ->assertStatus(200)
            ->assertJson(['updated' => 0, 'deleted' => 0]);

        $this->assertDatabaseHas('events', ['date' => '2026-10-05', 'time' => '08:00', 'source' => 'stag']);
        $this->assertDatabaseHas('subjects', ['code' => 'KMI/ZP1', 'source' => 'stag']);
    }

    public function test_changed_event_replaces_old_one_and_keeps_manual_event(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-schedule', [$this->scheduleItem('2026-10-05', '08:00')])
            ->assertStatus(200);

        $subject = Subject::where('user_id', $user->id)->where('code', 'KMI/ZP1')->firstOrFail();
        $manual = Event::create([
            'subject_id' => $subject->id,
            'title' => 'Konzultace',
            'date' => '2026-10-06',
            'time' => '12:00',
            'type' => 'Lecture',
        ]);

        // Přednáška se přesunula z 08:00 na 10:00
        $this->postJson('/api/stag/sync-schedule', [$this->scheduleItem('2026-10-05', '10:00')])
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Sync successful. 1 new schedule events were created.',
                'updated' => 0,
                'deleted' => 1,
            ]);

        $this->assertDatabaseMissing('events', ['subject_id' => $subject->id, 'date' => '2026-10-05', 'time' => '08:00']);
        $this->assertDatabaseHas('events', ['subject_id' => $subject->id, 'date' => '2026-10-05', 'time' => '10:00', 'source' => 'stag']);
        $this->assertDatabaseHas('events', ['id' => $manual->id, 'source' => 'manual']);
    }

    public function test_matching_event_is_updated_and_keeps_user_status(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-schedule', [$this->scheduleItem('2026-10-05', '08:00')])
            ->assertStatus(200);

        $event = Event::where('date', '2026-10-05')->where('time', '08:00')->firstOrFail();
        $event->update(['status' => 'Done']);

        $this->postJson('/api/stag/sync-schedule', [
            $this->scheduleItem('2026-10-05', '08:00', ['room' => 'LP 3.010', 'endTime' => '09:45', 'status' => 'Not Started']),
        ])
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Sync successful. 0 new schedule events were created.',
                'updated' => 1,
                'deleted' => 0,
            ]);

        $event->refresh();
        $this->assertEquals('LP 3.010', $event->room);
        $this->assertEquals('09:45', $event->end_time);
        $this->assertEquals('Done', $event->status);
        $this->assertEquals(1, Event::where('subject_id', $event->subject_id)->count());
    }

    public function test_empty_schedule_deletes_nothing(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-schedule', [$this->scheduleItem('2026-10-05', '08:00')])
            ->assertStatus(200);

        $this->postJson('/api/stag/sync-schedule', [])
            ->assertStatus(200)
            ->assertJson(['updated' => 0, 'deleted' => 0]);

        $this->assertEquals(1, Event::where('source', 'stag')->count());
    }

    public function test_events_of_subjects_missing_from_data_are_kept(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $other = Subject::create([
            'user_id' => $user->id,
            'code' => 'KMI/OLD',
            'name' => 'Starý předmět',
            'credits' => 3,
            'lecturer' => 'Nespecifikováno',
            'semester' => 'LS 2026',
            'source' => 'stag',
        ]);
        $otherEvent = Event::create([
            'subject_id' => $other->id,
            'title' => 'Starý předmět (Cvičení)',
            'date' => '2026-03-02',
            'time' => '08:00',
            'type' => 'Cvičení',
            'source' => 'stag',
        ]);

        $this->postJson('/api/stag/sync-schedule', [$this->scheduleItem('2026-10-05', '08:00')])
            ->assertStatus(200)
            ->assertJson(['deleted' => 0]);

        $this->assertDatabaseHas('events', ['id' => $otherEvent->id]);
    }
}
