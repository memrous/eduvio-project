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

    /** Creates a user with full STAG credentials and a given sync status. */
    private function stagUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'stag_student_id'           => 'S12345',
            'stag_username'             => 'stag_user',
            'stag_password'             => 'stag_pass',
            'stag_sync_status'          => 'success',
            'stag_synced_at'            => now(),
            'stag_last_sync_attempt_at' => null,
        ], $overrides));
    }

    // ── Success path ──────────────────────────────────────────────────

    public function test_resync_succeeds_when_cooldown_has_passed(): void
    {
        Queue::fake();

        // Last attempt was 31 minutes ago — cooldown (30 min) has elapsed
        $user = $this->stagUser([
            'stag_last_sync_attempt_at' => now()->subMinutes(31),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Resync started in background.');
        $response->assertJsonStructure(['user', 'message', 'next_allowed_at']);

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

    // ── Rate-limit (cooldown) ─────────────────────────────────────────

    public function test_resync_returns_429_while_cooldown_is_active(): void
    {
        Queue::fake();

        // Last attempt was only 5 minutes ago — still within 30-minute cooldown
        $user = $this->stagUser([
            'stag_last_sync_attempt_at' => now()->subMinutes(5),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(429);
        $response->assertJsonStructure(['message', 'retry_after_seconds', 'next_allowed_at']);

        // 5 min elapsed → ~25 min remaining (±10 s tolerance for test execution time)
        $retryAfter = $response->json('retry_after_seconds');
        $this->assertGreaterThan(0, $retryAfter);
        $this->assertLessThanOrEqual(25 * 60 + 10, $retryAfter);

        Queue::assertNothingPushed();
    }

    // ── Already pending ───────────────────────────────────────────────

    public function test_resync_returns_429_when_sync_already_pending(): void
    {
        Queue::fake();

        $user = $this->stagUser([
            'stag_sync_status'          => 'pending',
            'stag_last_sync_attempt_at' => now()->subMinutes(31), // cooldown elapsed, but still pending
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
            'stag_student_id'  => null,
            'stag_username'    => null,
            'stag_password'    => null,
            'stag_sync_status' => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/stag/resync');

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'STAG is not connected.');

        Queue::assertNothingPushed();
    }
}
