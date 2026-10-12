<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Settings for a production deployment: registration switch, login/register
 * rate limit, health check and error responses without debug details.
 */
class ProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return array_merge([
            'name'     => 'Jan Novák',
            'username' => 'jannovak',
            'email'    => 'jan@upol.cz',
            'password' => 'password123',
        ], $overrides);
    }

    // ── Registration switch ───────────────────────────────────────

    public function test_config_endpoint_is_public_and_reports_registration(): void
    {
        config(['registration.enabled' => false, 'registration.allowed_domains' => ['upol.cz']]);

        $this->getJson('/api/config')
            ->assertOk()
            ->assertExactJson(['registration' => ['enabled' => false, 'allowed_domains' => ['upol.cz']]]);
    }

    public function test_register_is_forbidden_when_registration_is_disabled(): void
    {
        config(['registration.enabled' => false]);

        $this->postJson('/api/register', $this->registration())
            ->assertStatus(403)
            ->assertJsonPath('error', 'registration_disabled');
        $this->assertDatabaseCount('users', 0);

        // The availability check belongs to the registration form and closes with it
        $this->postJson('/api/check-availability', ['email' => 'jan@upol.cz', 'username' => 'jannovak'])
            ->assertStatus(403);
    }

    public function test_register_works_when_enabled(): void
    {
        config(['registration.enabled' => true, 'registration.allowed_domains' => []]);

        $this->postJson('/api/register', $this->registration(['email' => 'jan@example.com']))->assertStatus(201);
    }

    public function test_allowed_domains_limit_registration(): void
    {
        config(['registration.enabled' => true, 'registration.allowed_domains' => ['upol.cz']]);

        $this->postJson('/api/register', $this->registration(['email' => 'jan@gmail.com']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->postJson('/api/register', $this->registration(['email' => 'Jan@UPOL.cz']))->assertStatus(201);
    }

    // ── Rate limit ────────────────────────────────────────────────

    public function test_login_is_rate_limited_per_ip_and_email(): void
    {
        User::factory()->create(['email' => 'jan@upol.cz']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'jan@upol.cz', 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/api/login', ['email' => 'jan@upol.cz', 'password' => 'wrong'])->assertStatus(429);

        // Another e-mail from the same IP has its own limit
        $this->postJson('/api/login', ['email' => 'other@upol.cz', 'password' => 'wrong'])->assertStatus(422);
    }

    public function test_register_is_rate_limited(): void
    {
        config(['registration.enabled' => true]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/register', ['email' => 'spam@upol.cz'])->assertStatus(422);
        }
        $this->postJson('/api/register', ['email' => 'spam@upol.cz'])->assertStatus(429);
    }

    // ── Health check ──────────────────────────────────────────────

    public function test_health_check_needs_no_login(): void
    {
        $this->get('/up')->assertOk();
    }

    // ── Errors without debug details ──────────────────────────────

    public function test_errors_do_not_leak_details_when_debug_is_off(): void
    {
        config(['app.debug' => false]);

        Route::middleware('api')->prefix('api')->group(function () {
            Route::get('/_test/exception', fn () => throw new \RuntimeException('secret in '.base_path('app/Secret.php')));
            Route::get('/_test/sql', fn () => DB::select('select secret_column from missing_table'));
        });

        foreach (['/api/_test/exception', '/api/_test/sql'] as $url) {
            $response = $this->getJson($url)->assertStatus(500);
            $body = $response->getContent();

            $this->assertSame(['message' => 'Server Error'], $response->json(), $url);
            foreach (['trace', 'exception', 'file', 'line'] as $key) {
                $response->assertJsonMissingPath($key);
            }
            foreach (['secret', 'missing_table', 'select', 'SQLSTATE', base_path(), '.php'] as $leak) {
                $this->assertStringNotContainsStringIgnoringCase($leak, $body, "{$url} leaks {$leak}");
            }
        }
    }
}
