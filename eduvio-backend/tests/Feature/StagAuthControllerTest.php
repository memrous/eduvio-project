<?php

namespace Tests\Feature;

use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StagAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_redirect_requires_authentication(): void
    {
        $response = $this->getJson('/api/user/stag/redirect');
        $response->assertStatus(401);
    }

    public function test_redirect_generates_state_and_returns_stag_login_url(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user/stag/redirect');

        $response->assertStatus(200);
        $response->assertJsonStructure(['redirect_url']);

        $redirectUrl = $response->json('redirect_url');
        $this->assertStringContainsString(config('stag.ws_base_url') . '/login', $redirectUrl);
        $this->assertStringContainsString('longTicket=1', $redirectUrl);

        // Verify state parameter in callback URL and in Cache
        parse_str(parse_url($redirectUrl, PHP_URL_QUERY), $queryParams);
        $this->assertArrayHasKey('originalURL', $queryParams);

        parse_str(parse_url($queryParams['originalURL'], PHP_URL_QUERY), $callbackParams);
        $this->assertArrayHasKey('state', $callbackParams);

        $state = $callbackParams['state'];
        $this->assertEquals($user->id, Cache::get("stag_state:{$state}"));
    }

    public function test_callback_fails_with_invalid_state(): void
    {
        $frontendUrl = config('stag.frontend_url');
        $response = $this->get('/stag/callback?state=non_existent_state');

        $response->assertRedirect("{$frontendUrl}/profile?stag=error&reason=state_invalid");
    }

    public function test_callback_handles_cancelled_login(): void
    {
        $frontendUrl = config('stag.frontend_url');
        $user = User::factory()->create();
        $state = 'valid_state_for_cancelled_test_1234567890';
        Cache::put("stag_state:{$state}", $user->id, now()->addMinutes(10));

        $response = $this->get("/stag/callback?state={$state}&stagUserTicket=anonymous");

        $response->assertRedirect("{$frontendUrl}/profile?stag=error&reason=cancelled");
        $this->assertNull(Cache::get("stag_state:{$state}"));
    }

    public function test_callback_fails_when_no_student_role(): void
    {
        $frontendUrl = config('stag.frontend_url');
        $user = User::factory()->create();
        $state = 'valid_state_for_no_student_role_123456789';
        Cache::put("stag_state:{$state}", $user->id, now()->addMinutes(10));

        $userInfo = base64_encode(json_encode([
            [
                'userName' => 'VYUC01',
                'role' => 'UC', // Teacher, not student
                'osCislo' => 'U12345',
            ]
        ]));

        $response = $this->get("/stag/callback?state={$state}&stagUserTicket=valid_ticket&stagUserInfo={$userInfo}");

        $response->assertRedirect("{$frontendUrl}/profile?stag=error&reason=no_student_role");
        $this->assertNull(Cache::get("stag_state:{$state}"));
    }

    public function test_callback_successful_flow_updates_user_and_dispatches_sync(): void
    {
        $frontendUrl = config('stag.frontend_url');
        Queue::fake();

        $user = User::factory()->create([
            'stag_ticket' => null,
            'stag_ticket_expires_at' => null,
            'stag_user_name' => null,
            'stag_student_id' => null,
            'stag_sync_status' => null,
        ]);

        $state = 'valid_state_for_success_test_1234567890123';
        Cache::put("stag_state:{$state}", $user->id, now()->addMinutes(10));

        $userInfo = base64_encode(json_encode([
            'stagUserInfo' => [
                [
                    'userName' => 'A21B0001P',
                    'role' => 'ST',
                    'osCislo' => 'R21001',
                    'fakulta' => 'PRF',
                ]
            ]
        ]));

        $ticket = 'my_long_term_stag_ticket_token_123';

        $response = $this->get("/stag/callback?state={$state}&stagUserTicket={$ticket}&stagUserInfo={$userInfo}");

        $response->assertRedirect("{$frontendUrl}/profile?stag=connected");

        // State must be removed from cache (pull)
        $this->assertNull(Cache::get("stag_state:{$state}"));

        // User must be updated
        $user->refresh();
        $this->assertEquals($ticket, $user->stag_ticket);
        $this->assertEquals('A21B0001P', $user->stag_user_name);
        $this->assertEquals('R21001', $user->stag_student_id);
        $this->assertEquals('pending', $user->stag_sync_status);
        $this->assertNull($user->stag_sync_error);
        $this->assertNotNull($user->stag_ticket_expires_at);
        $this->assertNotNull($user->stag_last_sync_attempt_at);

        Queue::assertPushed(StagSyncJob::class, function ($job) use ($user) {
            return $job->user->id === $user->id;
        });
    }
}
