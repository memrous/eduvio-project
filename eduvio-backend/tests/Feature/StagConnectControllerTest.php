<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StagConnectControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_disconnect_stag(): void
    {
        $user = User::factory()->create([
            'stag_student_id'           => 'S12345',
            'stag_ticket'               => 'stag-ticket-abc',
            'stag_ticket_expires_at'    => now()->addDays(30),
            'stag_user_name'            => 'stag_user_123',
            'stag_sync_status'          => 'success',
            'stag_sync_error'           => 'old error',
            'stag_synced_at'            => now(),
            'stag_last_sync_attempt_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/stag');

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'IS/STAG disconnected.');
        $response->assertJsonPath('user.stag_connected', false);

        $user->refresh();
        $this->assertNull($user->stag_student_id);
        $this->assertNull($user->stag_ticket);
        $this->assertNull($user->stag_ticket_expires_at);
        $this->assertNull($user->stag_user_name);
        $this->assertNull($user->stag_sync_status);
        $this->assertNull($user->stag_sync_error);
        $this->assertNull($user->stag_synced_at);
        $this->assertNull($user->stag_last_sync_attempt_at);
        $this->assertFalse($user->stag_connected);
    }

    public function test_disconnect_clears_student_info_but_keeps_subjects_schedule_and_results(): void
    {
        $studentInfo = [
            'stag_display_name'    => 'Bc. Jan Novák',
            'study_program'        => 'Aplikovaná informatika',
            'study_program_code'   => 'B0613A140005',
            'faculty'              => 'PRF',
            'study_form'           => 'P',
            'study_type'           => 'B',
            'study_type_key'       => '7',
            'study_year'           => 2,
            'study_status'         => 'S',
            'study_officer_name'   => 'Nováková Jana',
            'study_officer_email'  => 'jana.novakova@upol.cz',
            'study_officer_phone'  => '585 634 000',
            'study_info_synced_at' => now(),
        ];
        $user = User::factory()->create($studentInfo + [
            'stag_student_id' => 'S12345',
            'stag_ticket'     => 'stag-ticket-abc',
        ]);
        $subject = Subject::create([
            'user_id'     => $user->id,
            'code'        => 'KMI/ZPP1',
            'name'        => 'Základy programování',
            'credits'     => 5,
            'lecturer'    => 'Dr. Smith',
            'semester'    => 'ZS 2026',
            'final_grade' => 'A',
        ]);
        $event = Event::create([
            'subject_id' => $subject->id,
            'title'      => 'Cvičení',
            'date'       => '2026-10-12',
            'time'       => '09:45',
            'type'       => 'Cvičení',
            'source'     => 'stag',
        ]);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user/stag')
            ->assertStatus(200)
            ->assertJsonPath('user.stag_display_name', null)
            ->assertJsonPath('user.study_program', null);

        $user->refresh();
        foreach (array_keys($studentInfo) as $column) {
            $this->assertNull($user->{$column}, "{$column} should be cleared");
        }
        $this->assertDatabaseHas('subjects', ['id' => $subject->id, 'final_grade' => 'A']);
        $this->assertDatabaseHas('events', ['id' => $event->id]);
    }

    public function test_user_can_get_stag_sync_status(): void
    {
        $user = User::factory()->create([
            'stag_ticket'            => 'stag-ticket-abc',
            'stag_ticket_expires_at' => now()->addDays(30),
            'stag_sync_status'       => 'pending',
            'stag_synced_at'         => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/stag/status');

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'stag_connected'   => true,
            'stag_sync_status' => 'pending',
            'stag_synced_at'   => null,
        ]);
        $response->assertJsonStructure(['stag_connected', 'stag_sync_status', 'stag_synced_at']);
    }

    public function test_status_reports_not_connected_without_ticket(): void
    {
        $user = User::factory()->create(['stag_ticket' => null]);

        $this->actingAs($user, 'sanctum')->getJson('/api/user/stag/status')
            ->assertStatus(200)
            ->assertJsonPath('stag_connected', false);
    }

    public function test_status_reports_not_connected_with_expired_ticket(): void
    {
        $user = User::factory()->create([
            'stag_ticket'            => 'stag-ticket-abc',
            'stag_ticket_expires_at' => now()->subMinute(),
        ]);

        $this->actingAs($user, 'sanctum')->getJson('/api/user/stag/status')
            ->assertStatus(200)
            ->assertJsonPath('stag_connected', false);
    }
}
