<?php

namespace Tests\Feature;

use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * "Sync now" from the app in agent mode: the app leaves a request, the agent
 * (`stag_agent.py watch`) polls GET /stag/agent/pending and reports back.
 * Real Sanctum tokens, so abilities are checked as in production.
 */
class StagAgentWatchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $fullToken;

    protected function setUp(): void
    {
        parent::setUp();

        config(['stag.mode' => 'agent']);
        $this->user = User::factory()->create();
        $this->fullToken = $this->user->createToken('auth_token')->plainTextToken;
    }

    private function asToken(string $token, string $method, string $uri, array $data = []): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token)->json($method, $uri, $data);
    }

    private function agentToken(): string
    {
        return $this->asToken($this->fullToken, 'POST', '/api/user/stag/agent-token')->assertStatus(201)->json('token');
    }

    // ── 2. Request a sync ─────────────────────────────────────────

    public function test_request_sync_leaves_a_request_for_the_agent(): void
    {
        $this->agentToken();

        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')
            ->assertStatus(202)
            ->assertJsonPath('agent_online', false);

        $this->assertNotNull($this->user->fresh()->stag_sync_requested_at);
    }

    public function test_request_sync_has_a_two_minute_cooldown(): void
    {
        $this->agentToken();
        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')->assertStatus(202);

        $this->travel(30)->seconds();
        $response = $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')->assertStatus(429);
        $this->assertGreaterThan(80, $response->json('retry_after'));
        $this->assertLessThanOrEqual(90, $response->json('retry_after'));

        $this->travel(91)->seconds();
        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')->assertStatus(202);
    }

    public function test_request_sync_needs_a_configured_agent(): void
    {
        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')
            ->assertStatus(422)
            ->assertJsonPath('error', 'agent_not_configured');
        $this->assertNull($this->user->fresh()->stag_sync_requested_at);
    }

    public function test_request_sync_in_server_mode_is_the_server_resync(): void
    {
        config(['stag.mode' => 'server']);
        Queue::fake();
        $this->user->update(['stag_ticket' => 'ticket', 'stag_ticket_expires_at' => now()->addDay()]);

        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')
            ->assertOk()
            ->assertJsonPath('message', 'Resync started in background.');

        Queue::assertPushed(StagSyncJob::class);
        $this->assertNull($this->user->fresh()->stag_sync_requested_at);
    }

    public function test_agent_token_cannot_request_a_sync(): void
    {
        $agentToken = $this->agentToken();

        $this->asToken($agentToken, 'POST', '/api/user/stag/request-sync')->assertForbidden();
    }

    // ── 3. Agent polls ────────────────────────────────────────────

    public function test_pending_reports_the_request_and_marks_the_agent_seen(): void
    {
        $agentToken = $this->agentToken();

        $this->asToken($agentToken, 'GET', '/api/stag/agent/pending')
            ->assertOk()
            ->assertExactJson(['sync_requested' => false, 'requested_at' => null]);
        $this->assertNotNull($this->user->fresh()->stag_agent_last_seen_at);

        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')->assertStatus(202);

        $this->asToken($agentToken, 'GET', '/api/stag/agent/pending')
            ->assertOk()
            ->assertJsonPath('sync_requested', true)
            ->assertJsonPath('requested_at', $this->user->fresh()->stag_sync_requested_at->toIso8601String());
    }

    public function test_pending_needs_the_agent_ability(): void
    {
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/stag/agent/pending')->assertUnauthorized();

        $other = $this->user->createToken('other', ['something:else'])->plainTextToken;
        $this->asToken($other, 'GET', '/api/stag/agent/pending')->assertForbidden();
    }

    // ── 4. Report clears the request ──────────────────────────────

    public function test_report_clears_the_request_on_success_and_failure(): void
    {
        $agentToken = $this->agentToken();

        foreach (['success', 'failed'] as $status) {
            $this->user->update(['stag_sync_requested_at' => now()->subMinutes(5)]);

            $this->asToken($agentToken, 'POST', '/api/stag/agent/report', ['status' => $status, 'error' => 'Přihlas se do STAGu na notebooku'])
                ->assertOk();

            $this->assertNull($this->user->fresh()->stag_sync_requested_at, $status);
        }
        $this->assertSame('Přihlas se do STAGu na notebooku', $this->user->fresh()->stag_sync_error);
    }

    // ── 5. Status ─────────────────────────────────────────────────

    public function test_status_shows_whether_the_agent_is_online(): void
    {
        $agentToken = $this->agentToken();

        $this->asToken($this->fullToken, 'GET', '/api/user/stag/status')
            ->assertOk()
            ->assertJsonPath('agent_online', false)
            ->assertJsonPath('agent_last_seen_at', null)
            ->assertJsonPath('sync_requested_at', null);

        $this->asToken($agentToken, 'GET', '/api/stag/agent/pending')->assertOk();
        $this->asToken($this->fullToken, 'POST', '/api/user/stag/request-sync')->assertStatus(202);

        $this->asToken($this->fullToken, 'GET', '/api/user/stag/status')
            ->assertJsonPath('agent_online', true)
            ->assertJsonPath('agent_last_seen_at', $this->user->fresh()->stag_agent_last_seen_at->toIso8601String())
            ->assertJsonPath('sync_requested_at', $this->user->fresh()->stag_sync_requested_at->toIso8601String());

        // No poll for more than 5 minutes → offline
        $this->travel(6)->minutes();
        $this->asToken($this->fullToken, 'GET', '/api/user/stag/status')->assertJsonPath('agent_online', false);
    }
}
