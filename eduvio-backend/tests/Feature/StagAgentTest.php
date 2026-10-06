<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Uses real Sanctum tokens (not Sanctum::actingAs) so ability and expiry checks
 * run exactly as in production.
 */
class StagAgentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $fullToken;

    protected function setUp(): void
    {
        parent::setUp();

        config(['stag.mode' => 'server', 'stag.agent_token_ttl_days' => 180]);

        $this->user = User::factory()->create([
            'name'  => 'Jana Agentová',
            'email' => 'jana@example.com',
        ]);
        $this->fullToken = $this->user->createToken('auth_token')->plainTextToken;
    }

    /** Sends a request with the given bearer token, resetting the cached guard user. */
    private function asToken(string $token, string $method, string $uri, array $data = []): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token)->json($method, $uri, $data);
    }

    private function issueAgentToken(): string
    {
        return $this->asToken($this->fullToken, 'POST', '/api/user/stag/agent-token')
            ->assertStatus(201)
            ->json('token');
    }

    private function subjectsPayload(): array
    {
        return [[
            'code'     => 'KMI/AGT',
            'name'     => 'Agent Subject',
            'credits'  => 5,
            'semester' => 'ZS',
        ]];
    }

    private function schedulePayload(): array
    {
        return [[
            'subject' => [
                'code'     => 'KMI/AGT',
                'name'     => 'Agent Subject',
                'credits'  => 5,
                'lecturer' => 'Dr. Agent',
                'semester' => 'ZS',
            ],
            'event' => [
                'title'     => 'Agent Subject',
                'date'      => '2026-10-12',
                'startTime' => '09:00',
                'endTime'   => '10:30',
                'type'      => 'Lecture',
            ],
        ]];
    }

    // ── Token management ────────────────────────────────────────────

    public function test_creating_agent_token_returns_plain_token_once_and_revokes_previous(): void
    {
        $response = $this->asToken($this->fullToken, 'POST', '/api/user/stag/agent-token');

        $response->assertStatus(201)->assertJsonStructure(['token', 'expires_at']);
        $first = $response->json('token');

        $stored = PersonalAccessToken::findToken($first);
        $this->assertSame(User::STAG_AGENT_TOKEN, $stored->name);
        $this->assertSame(['stag:sync'], $stored->abilities);
        $this->assertTrue($stored->expires_at->between(now()->addDays(179), now()->addDays(181)));

        $second = $this->issueAgentToken();

        $this->assertNotSame($first, $second);
        $this->assertNull(PersonalAccessToken::findToken($first));
        $this->assertSame(1, $this->user->stagAgentTokens()->count());

        // The old token no longer authenticates
        $this->asToken($first, 'GET', '/api/stag/agent/whoami')->assertStatus(401);
        $this->asToken($second, 'GET', '/api/stag/agent/whoami')->assertOk();
    }

    public function test_revoking_agent_token(): void
    {
        $agentToken = $this->issueAgentToken();

        $this->asToken($this->fullToken, 'DELETE', '/api/user/stag/agent-token')->assertOk();

        $this->assertSame(0, $this->user->stagAgentTokens()->count());
        $this->asToken($agentToken, 'GET', '/api/stag/agent/whoami')->assertStatus(401);
        // The full token is untouched
        $this->asToken($this->fullToken, 'GET', '/api/user')->assertOk();
    }

    public function test_agent_token_endpoints_require_authentication(): void
    {
        $this->postJson('/api/user/stag/agent-token')->assertStatus(401);
        $this->deleteJson('/api/user/stag/agent-token')->assertStatus(401);
        $this->getJson('/api/stag/agent/whoami')->assertStatus(401);
        $this->postJson('/api/stag/agent/report', ['status' => 'success'])->assertStatus(401);
    }

    // ── Agent token scope ───────────────────────────────────────────

    public function test_agent_token_can_reach_agent_endpoints(): void
    {
        $agentToken = $this->issueAgentToken();

        $this->asToken($agentToken, 'POST', '/api/stag/sync-subjects', $this->subjectsPayload())->assertSuccessful();
        $this->asToken($agentToken, 'POST', '/api/stag/sync-schedule', $this->schedulePayload())->assertSuccessful();
        $this->asToken($agentToken, 'POST', '/api/stag/agent/report', ['status' => 'success'])->assertOk();
        $this->asToken($agentToken, 'GET', '/api/stag/agent/whoami')
            ->assertOk()
            ->assertExactJson(['name' => 'Jana Agentová', 'email' => 'jana@example.com']);

        $this->assertTrue(Subject::where('user_id', $this->user->id)->where('code', 'KMI/AGT')->exists());
    }

    public function test_agent_token_is_forbidden_everywhere_else(): void
    {
        $agentToken = $this->issueAgentToken();

        $this->asToken($agentToken, 'GET', '/api/user')->assertStatus(403);
        $this->asToken($agentToken, 'GET', '/api/materials')->assertStatus(403);
        $this->asToken($agentToken, 'GET', '/api/subjects')->assertStatus(403);
        $this->asToken($agentToken, 'GET', '/api/user/stag/status')->assertStatus(403);
        $this->asToken($agentToken, 'POST', '/api/user/stag/agent-token')->assertStatus(403);
        $this->asToken($agentToken, 'DELETE', '/api/user/stag/agent-token')->assertStatus(403);
        $this->asToken($agentToken, 'DELETE', '/api/user/stag')->assertStatus(403);
        $this->asToken($agentToken, 'POST', '/api/logout')->assertStatus(403);

        // Nothing was changed by the rejected calls
        $this->assertSame(1, $this->user->stagAgentTokens()->count());
    }

    public function test_full_token_still_works_everywhere(): void
    {
        Queue::fake();

        $this->asToken($this->fullToken, 'GET', '/api/user')->assertOk();
        $this->asToken($this->fullToken, 'GET', '/api/materials')->assertOk();
        $this->asToken($this->fullToken, 'GET', '/api/subjects')->assertOk();
        $this->asToken($this->fullToken, 'GET', '/api/user/stag/status')->assertOk();
        $this->asToken($this->fullToken, 'POST', '/api/stag/sync-subjects', $this->subjectsPayload())->assertSuccessful();
        $this->asToken($this->fullToken, 'POST', '/api/stag/sync-schedule', $this->schedulePayload())->assertSuccessful();
        $this->asToken($this->fullToken, 'POST', '/api/stag/agent/report', ['status' => 'success'])->assertOk();
        $this->asToken($this->fullToken, 'GET', '/api/stag/agent/whoami')->assertOk();
    }

    public function test_token_without_any_ability_is_rejected_on_both_groups(): void
    {
        $restricted = $this->user->createToken('other', ['something:else'])->plainTextToken;

        $this->asToken($restricted, 'GET', '/api/user')->assertStatus(403);
        $this->asToken($restricted, 'GET', '/api/stag/agent/whoami')->assertStatus(403);
    }

    public function test_expired_agent_token_is_rejected(): void
    {
        $agentToken = $this->issueAgentToken();

        $this->travel(181)->days();

        $this->asToken($agentToken, 'GET', '/api/stag/agent/whoami')->assertStatus(401);
        $this->asToken($agentToken, 'POST', '/api/stag/sync-subjects', $this->subjectsPayload())->assertStatus(401);
    }

    // ── Report ──────────────────────────────────────────────────────

    public function test_report_success_sets_synced_state(): void
    {
        $this->user->update(['stag_sync_status' => 'failed', 'stag_sync_error' => 'old error']);
        $agentToken = $this->issueAgentToken();

        $this->asToken($agentToken, 'POST', '/api/stag/agent/report', ['status' => 'success'])->assertOk();

        $this->user->refresh();
        $this->assertSame('success', $this->user->stag_sync_status);
        $this->assertNull($this->user->stag_sync_error);
        $this->assertNotNull($this->user->stag_synced_at);
    }

    public function test_report_failed_stores_truncated_error(): void
    {
        $this->user->update(['stag_synced_at' => now()->subDay()]);
        $syncedAt = $this->user->fresh()->stag_synced_at;
        $agentToken = $this->issueAgentToken();

        $this->asToken($agentToken, 'POST', '/api/stag/agent/report', [
            'status' => 'failed',
            'error'  => str_repeat('x', 800),
        ])->assertOk();

        $this->user->refresh();
        $this->assertSame('failed', $this->user->stag_sync_status);
        $this->assertSame(str_repeat('x', 500), $this->user->stag_sync_error);
        // Last successful sync time is kept
        $this->assertEquals($syncedAt->timestamp, $this->user->stag_synced_at->timestamp);
    }

    public function test_report_validates_status(): void
    {
        $agentToken = $this->issueAgentToken();

        $this->asToken($agentToken, 'POST', '/api/stag/agent/report', ['status' => 'done'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    // ── Mode ────────────────────────────────────────────────────────

    public function test_agent_mode_blocks_server_side_stag_flow(): void
    {
        Queue::fake();
        config(['stag.mode' => 'agent']);
        $this->user->update([
            'stag_ticket'            => 'ticket',
            'stag_ticket_expires_at' => now()->addDays(30),
        ]);

        $this->asToken($this->fullToken, 'GET', '/api/user/stag/redirect')
            ->assertStatus(409)
            ->assertJson(['error' => 'agent_mode']);
        $this->asToken($this->fullToken, 'POST', '/api/user/stag/resync')
            ->assertStatus(409)
            ->assertJson(['error' => 'agent_mode']);
        $this->getJson('/stag/callback?state=anything')
            ->assertStatus(409)
            ->assertJson(['error' => 'agent_mode']);

        Queue::assertNothingPushed();
    }

    public function test_server_mode_keeps_server_side_stag_flow(): void
    {
        Queue::fake();
        $this->user->update([
            'stag_ticket'            => 'ticket',
            'stag_ticket_expires_at' => now()->addDays(30),
        ]);

        $this->asToken($this->fullToken, 'GET', '/api/user/stag/redirect')
            ->assertOk()
            ->assertJsonStructure(['redirect_url']);
        $this->asToken($this->fullToken, 'POST', '/api/user/stag/resync')->assertOk();
    }

    public function test_stag_connected_follows_agent_token_in_agent_mode(): void
    {
        config(['stag.mode' => 'agent']);
        // A ticket alone does not count in agent mode
        $this->user->update(['stag_ticket' => 'ticket', 'stag_ticket_expires_at' => null]);
        $this->assertFalse($this->user->fresh()->stag_connected);

        $this->issueAgentToken();
        $this->assertTrue($this->user->fresh()->stag_connected);

        $this->travel(181)->days();
        $this->assertFalse($this->user->fresh()->stag_connected);
    }

    // ── Status ──────────────────────────────────────────────────────

    public function test_status_returns_mode_and_token_metadata_but_never_the_token(): void
    {
        $this->asToken($this->fullToken, 'GET', '/api/user/stag/status')
            ->assertOk()
            ->assertJsonPath('mode', 'server')
            ->assertJsonPath('agent_token', null);

        $agentToken = $this->issueAgentToken();
        $this->asToken($agentToken, 'POST', '/api/stag/agent/report', ['status' => 'failed', 'error' => 'VPN down'])->assertOk();
        config(['stag.mode' => 'agent']);

        $response = $this->asToken($this->fullToken, 'GET', '/api/user/stag/status');

        $response->assertOk()
            ->assertJsonPath('mode', 'agent')
            ->assertJsonPath('stag_connected', true)
            ->assertJsonPath('stag_sync_status', 'failed')
            ->assertJsonPath('stag_sync_error', 'VPN down')
            ->assertJsonStructure([
                'stag_synced_at',
                'agent_token' => ['created_at', 'expires_at', 'last_used_at'],
            ]);
        $this->assertNotNull($response->json('agent_token.last_used_at'));

        [, $secret] = explode('|', $agentToken, 2);
        $this->assertStringNotContainsString($secret, $response->getContent());
        $this->assertStringNotContainsString($agentToken, $response->getContent());
    }
}
