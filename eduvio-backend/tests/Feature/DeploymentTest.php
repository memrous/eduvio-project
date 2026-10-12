<?php

namespace Tests\Feature;

use App\Models\Material;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Running behind Render's proxy: https URLs from X-Forwarded-*, a keep-alive
 * /up without the database, /api/health and eduvio:check-config.
 */
class DeploymentTest extends TestCase
{
    use RefreshDatabase;

    // ── Trusted proxy ─────────────────────────────────────────────

    public function test_forwarded_https_is_trusted_for_generated_urls(): void
    {
        Route::get('/_test/url', fn () => response()->json([
            'url'    => url('/api/materials/1/file'),
            'secure' => request()->isSecure(),
        ]));

        $this->getJson('/_test/url', [
            'X-Forwarded-Proto' => 'https',
            'X-Forwarded-Host'  => 'eduvio-api.onrender.com',
            'X-Forwarded-Port'  => '443',
        ])
            ->assertOk()
            ->assertJsonPath('secure', true)
            ->assertJsonPath('url', 'https://eduvio-api.onrender.com/api/materials/1/file');
    }

    // ── Keep-alive and health ─────────────────────────────────────

    public function test_up_answers_without_touching_the_database(): void
    {
        DB::enableQueryLog();

        $this->get('/up')->assertOk();

        $this->assertSame([], DB::getQueryLog());
    }

    public function test_health_checks_database_and_materials_disk(): void
    {
        Storage::fake('local');

        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['db' => 'ok', 'storage' => 'ok', 'queue_pending' => null]);

        // The probe file is removed again
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_health_counts_queued_jobs_with_the_database_queue(): void
    {
        Storage::fake('local');
        config(['queue.default' => 'database']);
        DB::table('jobs')->insert(['queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'available_at' => time(), 'created_at' => time()]);

        $this->getJson('/api/health')->assertOk()->assertJsonPath('queue_pending', 1);
    }

    public function test_health_reports_a_broken_disk_without_details(): void
    {
        $disk = \Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('put')->andThrow(new \RuntimeException('S3 403 secret-key-id'));
        Storage::shouldReceive('disk')->with(Material::filesDiskName())->andReturn($disk);

        $response = $this->getJson('/api/health')->assertStatus(503);

        $response->assertJsonPath('db', 'ok')->assertJsonPath('storage', 'fail');
        $this->assertStringNotContainsString('secret-key-id', $response->getContent());
    }

    public function test_health_needs_no_login_and_is_rate_limited(): void
    {
        Storage::fake('local');

        for ($i = 0; $i < 6; $i++) {
            $this->getJson('/api/health')->assertOk();
        }
        $this->getJson('/api/health')->assertStatus(429);
    }

    // ── eduvio:check-config ───────────────────────────────────────

    private function productionConfig(array $overrides = []): void
    {
        $this->app['env'] = 'production';
        config(array_merge([
            'app.debug'                              => false,
            'app.url'                                => 'https://eduvio-api.onrender.com',
            'cors.allowed_origins'                   => ['https://eduvio.vercel.app'],
            'registration.enabled'                   => false,
            'logging.default'                        => 'stderr',
            'logging.channels.stderr.level'          => 'warning',
            'database.connections.pgsql.sslmode'     => 'require',
            'queue.default'                          => 'database',
            'stag.mode'                              => 'agent',
            'filesystems.materials_disk'             => 's3',
            'filesystems.disks.s3.key'               => 'key',
            'filesystems.disks.s3.secret'            => 'secret',
            'filesystems.disks.s3.region'            => 'eu-central-1',
            'filesystems.disks.s3.bucket'            => 'materials',
            'filesystems.disks.s3.endpoint'          => 'https://ref.supabase.co/storage/v1/s3',
            'filesystems.disks.s3.use_path_style_endpoint' => true,
        ], $overrides));
    }

    public function test_check_config_passes_a_good_production_configuration(): void
    {
        $this->productionConfig();
        Storage::fake('s3');

        $this->artisan('eduvio:check-config')
            ->expectsOutputToContain('Database connection works.')
            ->expectsOutputToContain('Materials disk (s3) is writable.')
            ->expectsOutputToContain('0 error(s), 0 warning(s)')
            ->assertSuccessful();
    }

    public function test_check_config_warns_about_suspicious_production_values(): void
    {
        $this->productionConfig([
            'app.debug'                          => true,
            'cors.allowed_origins'               => ['http://localhost:5173'],
            'registration.enabled'               => true,
            'filesystems.materials_disk'         => 'local',
            'database.connections.pgsql.sslmode' => 'prefer',
            'logging.default'                    => 'stack',
        ]);

        $this->artisan('eduvio:check-config', ['--no-connect' => true])
            ->expectsOutputToContain('APP_DEBUG=true')
            ->expectsOutputToContain('does not use https://')
            ->expectsOutputToContain('REGISTRATION_ENABLED=true')
            ->expectsOutputToContain('MATERIALS_DISK=local')
            ->expectsOutputToContain('DB_SSLMODE')
            ->expectsOutputToContain('LOG_CHANNEL')
            // Only warnings: the start of the container goes on
            ->assertSuccessful();
    }

    public function test_check_config_fails_on_missing_values(): void
    {
        $this->productionConfig([
            'app.key'                    => '',
            'filesystems.disks.s3.key'   => null,
            'filesystems.disks.s3.bucket'=> null,
        ]);

        $this->artisan('eduvio:check-config', ['--no-connect' => true])
            ->expectsOutputToContain('APP_KEY is missing')
            ->expectsOutputToContain('AWS_ACCESS_KEY_ID is missing')
            ->expectsOutputToContain('AWS_BUCKET is missing')
            ->assertFailed();
    }

    public function test_check_config_reports_a_failing_storage_connection(): void
    {
        $this->productionConfig();
        $disk = \Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('put')->andReturn(false);
        Storage::shouldReceive('disk')->with('s3')->andReturn($disk);

        $this->artisan('eduvio:check-config')
            ->expectsOutputToContain('Materials disk check failed')
            ->assertFailed();
    }
}
