<?php

namespace Tests\Feature;

use App\Jobs\MoodleSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MoodleConnectTokenTest extends TestCase
{
    use RefreshDatabase;

    private const BASE_URL = 'https://moodle.example.test';
    private const PASSPORT = 'passport-abcdefghijklmnopqrstuvwx';
    private const WSTOKEN  = 'secret-wstoken-123';

    protected function setUp(): void
    {
        parent::setUp();

        // Trailing slash on purpose — the signature must use the trimmed URL.
        config([
            'moodle.base_url'           => self::BASE_URL . '/',
            'moodle.launch_urlscheme'   => 'web+eduvio',
            'moodle.launch_ttl_minutes' => 15,
        ]);
    }

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name'     => 'John Doe',
            'username' => 'johndoe',
            'email'    => 'john@example.com',
            'password' => 'password123',
        ], $overrides));
    }

    private function createUserWithLaunch(array $overrides = []): User
    {
        return $this->createUser(array_merge([
            'moodle_launch_passport'   => self::PASSPORT,
            'moodle_launch_expires_at' => now()->addMinutes(10),
        ], $overrides));
    }

    private function launchToken(?string $signature = null): string
    {
        $signature ??= md5(self::BASE_URL . self::PASSPORT);

        return implode(':::', [$signature, self::WSTOKEN, 'private-token']);
    }

    private function fakeSiteInfo(array $body): void
    {
        Http::fake([
            self::BASE_URL . '/webservice/rest/server.php*' => Http::response($body),
        ]);
    }

    // ── startLaunch ─────────────────────────────────────────────────

    public function test_launch_requires_authentication(): void
    {
        $this->postJson('/api/user/moodle/launch')->assertStatus(401);
    }

    public function test_launch_stores_passport_and_returns_launch_url(): void
    {
        $user = $this->createUser();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/launch');

        $response->assertOk()->assertJsonStructure(['launch_url']);

        $user->refresh();
        $passport = $user->moodle_launch_passport;
        $this->assertNotEmpty($passport);
        $this->assertSame(32, strlen($passport));
        $this->assertNotNull($user->moodle_launch_expires_at);
        $this->assertTrue($user->moodle_launch_expires_at->isFuture());
        $this->assertTrue($user->moodle_launch_expires_at->lte(now()->addMinutes(15)));

        $url = $response->json('launch_url');
        $this->assertStringStartsWith(self::BASE_URL . '/admin/tool/mobile/launch.php?', $url);

        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame('moodle_mobile_app', $query['service']);
        $this->assertSame($passport, $query['passport']);
        $this->assertSame('web+eduvio', $query['urlscheme']);
        $this->assertStringContainsString('urlscheme=web%2Beduvio', $url);

        $this->assertArrayNotHasKey('moodle_launch_passport', $user->toArray());
    }

    public function test_new_launch_replaces_previous_passport(): void
    {
        $user = $this->createUserWithLaunch();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/launch')->assertOk();

        $this->assertNotSame(self::PASSPORT, $user->fresh()->moodle_launch_passport);
    }

    // ── connectToken ────────────────────────────────────────────────

    public function test_connect_token_requires_authentication(): void
    {
        $this->postJson('/api/user/moodle/token', ['token' => $this->launchToken()])
            ->assertStatus(401);
    }

    public function test_connect_token_requires_token(): void
    {
        $user = $this->createUserWithLaunch();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_connect_token_rejects_invalid_format(): void
    {
        Http::fake();
        $user = $this->createUserWithLaunch();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', ['token' => 'only:::two'])
            ->assertStatus(422)
            ->assertJson(['error' => 'invalid_token_format']);

        Http::assertNothingSent();
    }

    public function test_connect_token_without_launch_is_rejected(): void
    {
        Http::fake();
        $user = $this->createUser();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', ['token' => $this->launchToken()])
            ->assertStatus(422)
            ->assertJson(['error' => 'launch_not_started']);

        Http::assertNothingSent();
    }

    public function test_connect_token_with_expired_launch_is_rejected(): void
    {
        Http::fake();
        $user = $this->createUserWithLaunch(['moodle_launch_expires_at' => now()->subMinute()]);

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', ['token' => $this->launchToken()])
            ->assertStatus(422)
            ->assertJson(['error' => 'launch_not_started']);

        Http::assertNothingSent();
    }

    public function test_connect_token_with_wrong_signature_is_rejected_without_calling_moodle(): void
    {
        Http::fake();
        $user = $this->createUserWithLaunch();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', [
            'token' => $this->launchToken(md5(self::BASE_URL . 'some-other-passport')),
        ]);

        $response->assertStatus(422)->assertJson(['error' => 'invalid_signature']);
        $this->assertStringNotContainsString(self::PASSPORT, $response->getContent());
        $this->assertStringNotContainsString(self::WSTOKEN, $response->getContent());

        Http::assertNothingSent();
        $this->assertNull($user->fresh()->moodle_wstoken);
    }

    public function test_connect_token_accepts_uppercase_signature(): void
    {
        Queue::fake();
        $this->fakeSiteInfo(['fullname' => 'John Moodle', 'userid' => 77]);
        $user = $this->createUserWithLaunch();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', [
            'token' => $this->launchToken(strtoupper(md5(self::BASE_URL . self::PASSPORT))),
        ])->assertOk();
    }

    public function test_connect_token_with_moodle_exception_fails_validation(): void
    {
        Queue::fake();
        $this->fakeSiteInfo(['exception' => 'moodle_exception', 'errorcode' => 'invalidtoken']);
        $user = $this->createUserWithLaunch();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', ['token' => $this->launchToken()])
            ->assertStatus(422)
            ->assertJson(['error' => 'token_validation_failed']);

        $this->assertNull($user->fresh()->moodle_wstoken);
        Queue::assertNothingPushed();
    }

    public function test_connect_token_success_saves_token_clears_passport_and_dispatches_sync(): void
    {
        Queue::fake();
        $this->fakeSiteInfo(['fullname' => 'John Moodle', 'username' => 'jmoodle', 'userid' => 77]);
        $user = $this->createUserWithLaunch();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/moodle/token', [
            'token' => $this->launchToken(),
        ]);

        $response->assertOk()
            ->assertJsonPath('user.moodle_connected', true)
            ->assertJsonPath('user.moodle_display_name', 'John Moodle')
            ->assertJsonMissingPath('user.moodle_launch_passport')
            ->assertJsonMissingPath('user.moodle_launch_expires_at')
            ->assertJsonMissingPath('user.moodle_wstoken');
        $this->assertStringNotContainsString(self::PASSPORT, $response->getContent());
        $this->assertStringNotContainsString(self::WSTOKEN, $response->getContent());

        Http::assertSent(fn ($request) => $request['wstoken'] === self::WSTOKEN
            && $request['wsfunction'] === 'core_webservice_get_site_info');

        $user->refresh();
        $this->assertSame(self::WSTOKEN, $user->moodle_wstoken);
        $this->assertSame('John Moodle', $user->moodle_display_name);
        $this->assertSame(77, (int) $user->moodle_user_id);
        $this->assertSame('pending', $user->moodle_sync_status);
        $this->assertNull($user->moodle_launch_passport);
        $this->assertNull($user->moodle_launch_expires_at);

        Queue::assertPushed(MoodleSyncJob::class);
    }

    // ── disconnect ──────────────────────────────────────────────────

    public function test_disconnect_clears_launch_passport(): void
    {
        $user = $this->createUserWithLaunch([
            'moodle_wstoken'      => self::WSTOKEN,
            'moodle_display_name' => 'John Moodle',
            'moodle_user_id'      => 77,
        ]);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user/moodle')->assertOk();

        $user->refresh();
        $this->assertNull($user->moodle_wstoken);
        $this->assertNull($user->moodle_launch_passport);
        $this->assertNull($user->moodle_launch_expires_at);
    }
}
