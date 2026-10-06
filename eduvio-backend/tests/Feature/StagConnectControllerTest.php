<?php

namespace Tests\Feature;

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
        // status() now also includes next_allowed_at — use assertJsonFragment
        $response->assertJsonFragment([
            'stag_connected'   => true,
            'stag_sync_status' => 'pending',
            'stag_synced_at'   => null,
        ]);
        $response->assertJsonStructure(['stag_connected', 'stag_sync_status', 'stag_synced_at', 'next_allowed_at']);
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
