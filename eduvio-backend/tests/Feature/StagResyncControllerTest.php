<?php

namespace Tests\Feature;

use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StagResyncControllerTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────

    /** Creates a user with a valid STAG ticket and a given sync status. */
    private function stagUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'stag_student_id'           => 'S12345',
            'stag_ticket'               => 'stag-ticket-abc',
            'stag_ticket_expires_at'    => now()->addDays(30),
            'stag_user_name'            => 'stag_user',
            'stag_sync_status'          => 'success',
            'stag_synced_at'            => now(),
            'stag_last_sync_attempt_at' => null,
        ], $overrides));
    }

    // ── Success path ──────────────────────────────────────────────────

    public function test_resync_succeeds_after_previous_attempt(): void
    {
        Queue::fake();

        $user = $this->stagUser([
            'stag_last_sync_attempt_at' => now()->subMinutes(31),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Resync started in background.');
        $response->assertJsonStructure(['user', 'message']);

        $user->refresh();
        $this->assertEquals('pending', $user->stag_sync_status);
        $this->assertNotNull($user->stag_last_sync_attempt_at);

        Queue::assertPushed(StagSyncJob::class, fn($job) => $job->user->id === $user->id);
    }

    public function test_resync_succeeds_when_never_synced_before(): void
    {
        Queue::fake();

        $user = $this->stagUser([
            'stag_sync_status'          => null,
            'stag_synced_at'            => null,
            'stag_last_sync_attempt_at' => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(200);
        Queue::assertPushed(StagSyncJob::class);
    }

    // ── No cooldown ───────────────────────────────────────────────────

    public function test_recent_attempt_does_not_block_resync(): void
    {
        Queue::fake();

        $user = $this->stagUser([
            'stag_last_sync_attempt_at' => now()->subMinute(),
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync')->assertStatus(200);

        Queue::assertPushed(StagSyncJob::class);
    }

    // ── Already pending ───────────────────────────────────────────────

    public function test_resync_returns_429_when_sync_already_pending(): void
    {
        Queue::fake();

        $user = $this->stagUser([
            'stag_sync_status'          => 'pending',
            'stag_last_sync_attempt_at' => now()->subMinutes(31),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(429);
        $response->assertJsonPath('message', 'A sync is already in progress.');

        Queue::assertNothingPushed();
    }

    // ── STAG not connected ────────────────────────────────────────────

    public function test_resync_returns_422_when_stag_not_connected(): void
    {
        Queue::fake();

        $user = User::factory()->create([
            'stag_student_id'        => null,
            'stag_ticket'            => null,
            'stag_ticket_expires_at' => null,
            'stag_sync_status'       => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'STAG is not connected.');

        Queue::assertNothingPushed();
    }

    public function test_resync_returns_422_when_stag_ticket_expired(): void
    {
        Queue::fake();

        $user = $this->stagUser([
            'stag_ticket_expires_at'    => now()->subMinute(),
            'stag_last_sync_attempt_at' => now()->subMinutes(31),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'STAG is not connected.');

        Queue::assertNothingPushed();
    }
}
