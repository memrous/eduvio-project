<?php

namespace Tests\Feature;

use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StagConnectControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_connect_stag_credentials(): void
    {
        Queue::fake();

        $user = User::factory()->create([
            'stag_student_id' => null,
            'stag_username'   => null,
            'stag_password'   => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag', [
            'stag_student_id' => 'S12345',
            'stag_username'   => 'stag_user_123',
            'stag_password'   => 'stag_pass_123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'STAG credentials saved. Sync started in background.');

        $user->refresh();
        $this->assertEquals('S12345', $user->stag_student_id);
        $this->assertEquals('stag_user_123', $user->stag_username);
        $this->assertEquals('stag_pass_123', $user->stag_password);
        // connect() now sets stag_sync_status to 'pending' immediately
        $this->assertEquals('pending', $user->stag_sync_status);

        Queue::assertPushed(StagSyncJob::class, function ($job) use ($user) {
            return $job->user->id === $user->id;
        });
    }

    public function test_user_can_disconnect_stag_credentials(): void
    {
        $user = User::factory()->create([
            'stag_student_id'  => 'S12345',
            'stag_username'    => 'stag_user_123',
            'stag_password'    => 'stag_pass_123',
            'stag_sync_status' => 'success',
            'stag_synced_at'   => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/user/stag');

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'IS/STAG disconnected.');

        $user->refresh();
        $this->assertNull($user->stag_student_id);
        $this->assertNull($user->stag_username);
        $this->assertNull($user->stag_password);
        $this->assertNull($user->stag_sync_status);
        $this->assertNull($user->stag_synced_at);
    }

    public function test_user_can_get_stag_sync_status(): void
    {
        $user = User::factory()->create([
            'stag_sync_status' => 'pending',
            'stag_synced_at'   => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/stag/status');

        $response->assertStatus(200);
        // status() now also includes next_allowed_at — use assertJsonFragment
        $response->assertJsonFragment([
            'stag_sync_status' => 'pending',
            'stag_synced_at'   => null,
        ]);
        $response->assertJsonStructure(['stag_sync_status', 'stag_synced_at', 'next_allowed_at']);
    }
}
