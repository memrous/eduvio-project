<?php

namespace App\Console\Commands;

use App\Models\Material;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Checks the production configuration: missing values (errors), suspicious values
 * (warnings) and, unless --no-connect, the database and the materials disk
 * (writes and deletes a probe file). Reads config(), so it works with config:cache.
 * The container entrypoint runs it as a warning only.
 */
class CheckConfig extends Command
{
    protected $signature = 'eduvio:check-config {--no-connect : Skip the database and storage connection checks}';

    protected $description = 'Check the production configuration (missing or suspicious values, DB and storage connection)';

    private const PROBE_FILE = 'health/.check-config-probe';

    /** @var list<string> */
    private array $errors = [];

    /** @var list<string> */
    private array $warnings = [];

    public function handle(): int
    {
        $production = app()->environment('production');

        $this->checkApp($production);
        $this->checkDatabase($production);
        $this->checkMaterialsDisk($production);
        $this->checkRuntime($production);

        if (! $this->option('no-connect')) {
            $this->checkConnections();
        }

        foreach ($this->errors as $message) {
            $this->line("<fg=red>✗</> {$message}");
        }
        foreach ($this->warnings as $message) {
            $this->line("<fg=yellow>!</> {$message}");
        }

        $summary = sprintf('%d error(s), %d warning(s) (APP_ENV=%s).', count($this->errors), count($this->warnings), app()->environment());
        if ($this->errors === []) {
            $this->info(($this->warnings === [] ? '✓ Configuration OK: ' : 'Configuration usable: ').$summary);

            return self::SUCCESS;
        }
        $this->error('Configuration has errors: '.$summary);

        return self::FAILURE;
    }

    private function checkApp(bool $production): void
    {
        if (blank(config('app.key'))) {
            $this->errors[] = 'APP_KEY is missing (generate once with `php artisan key:generate --show` and never change it).';
        }
        if (blank(config('app.url'))) {
            $this->errors[] = 'APP_URL is missing.';
        }
        $frontend = (string) (config('cors.allowed_origins')[0] ?? '');
        if ($frontend === '') {
            $this->errors[] = 'FRONTEND_URL is missing (CORS and the STAG/Moodle return address).';
        }

        if (! $production) {
            return;
        }
        if (config('app.debug')) {
            $this->warnings[] = 'APP_DEBUG=true in production: error pages show code and settings.';
        }
        if (! str_starts_with((string) config('app.url'), 'https://')) {
            $this->warnings[] = 'APP_URL does not use https:// (file links would be http).';
        }
        if ($frontend !== '' && ! str_starts_with($frontend, 'https://')) {
            $this->warnings[] = "FRONTEND_URL ({$frontend}) does not use https://.";
        }
        if (config('registration.enabled')) {
            $this->warnings[] = 'REGISTRATION_ENABLED=true: anyone can create an account (turn it off after the first user).';
        }
        if (in_array(config('logging.default'), ['stack', 'single', 'daily'], true)) {
            $this->warnings[] = 'LOG_CHANNEL writes to storage/logs, which is lost on every deploy; use LOG_CHANNEL=stderr.';
        }
        if (config('logging.channels.stderr.level') === 'debug' && config('logging.default') === 'stderr') {
            $this->warnings[] = 'LOG_LEVEL=debug in production (noisy log); warning is recommended.';
        }
    }

    private function checkDatabase(bool $production): void
    {
        $name = (string) config('database.default');
        $connection = (array) config("database.connections.{$name}", []);

        if (blank($connection['url'] ?? null)) {
            foreach (['host' => 'DB_HOST', 'database' => 'DB_DATABASE', 'username' => 'DB_USERNAME', 'password' => 'DB_PASSWORD'] as $key => $env) {
                if (blank($connection[$key] ?? null)) {
                    $this->errors[] = "{$env} is missing.";
                }
            }
        }

        if (! $production) {
            return;
        }
        if (($connection['driver'] ?? null) !== 'pgsql') {
            $this->warnings[] = "DB_CONNECTION={$name}: production expects pgsql (Supabase).";
        } elseif (! in_array($connection['sslmode'] ?? null, ['require', 'verify-ca', 'verify-full'], true)) {
            $this->warnings[] = 'DB_SSLMODE is not require/verify-*: the database password could travel unencrypted.';
        }
        if (str_contains((string) ($connection['host'] ?? ''), 'pooler.supabase.com')
            && ! str_starts_with((string) ($connection['username'] ?? ''), 'postgres.')) {
            $this->warnings[] = 'The Supabase pooler needs DB_USERNAME in the form postgres.<project-ref>.';
        }
    }

    private function checkMaterialsDisk(bool $production): void
    {
        $diskName = Material::filesDiskName();
        $disk = config("filesystems.disks.{$diskName}");

        if (! is_array($disk)) {
            $this->errors[] = "MATERIALS_DISK={$diskName} is not a configured disk.";

            return;
        }

        if (($disk['driver'] ?? null) === 's3') {
            foreach (['key' => 'AWS_ACCESS_KEY_ID', 'secret' => 'AWS_SECRET_ACCESS_KEY', 'region' => 'AWS_DEFAULT_REGION', 'bucket' => 'AWS_BUCKET', 'endpoint' => 'AWS_ENDPOINT'] as $key => $env) {
                if (blank($disk[$key] ?? null)) {
                    $this->errors[] = "{$env} is missing (MATERIALS_DISK=s3).";
                }
            }
            if (str_contains((string) ($disk['endpoint'] ?? ''), 'supabase.co') && ! ($disk['use_path_style_endpoint'] ?? false)) {
                $this->warnings[] = 'Supabase Storage needs AWS_USE_PATH_STYLE_ENDPOINT=true.';
            }
        } elseif ($production && ($disk['driver'] ?? null) === 'local') {
            $this->warnings[] = "MATERIALS_DISK={$diskName}: uploaded files are lost on every deploy/restart (ephemeral disk); use s3.";
        }
    }

    private function checkRuntime(bool $production): void
    {
        if (! $production) {
            return;
        }
        if (config('queue.default') === 'sync') {
            $this->warnings[] = 'QUEUE_CONNECTION=sync: syncs would run inside web requests; use database.';
        }
        if (config('stag.mode') !== 'agent') {
            $this->warnings[] = 'STAG_MODE is not "agent": the server would need Python and the UPOL network to reach STAG.';
        }
    }

    private function checkConnections(): void
    {
        try {
            DB::select('select 1');
            $this->line('<fg=green>✓</> Database connection works.');
        } catch (Throwable $e) {
            $this->errors[] = 'Database connection failed: '.$this->shortError($e);
        }

        try {
            $disk = Material::filesDisk();
            if (! $disk->put(self::PROBE_FILE, 'eduvio') || ! $disk->delete(self::PROBE_FILE)) {
                throw new \RuntimeException('writing or deleting a test file failed (check keys, bucket and endpoint)');
            }
            $this->line('<fg=green>✓</> Materials disk ('.Material::filesDiskName().') is writable.');
        } catch (Throwable $e) {
            $this->errors[] = 'Materials disk check failed: '.$this->shortError($e);
        }
    }

    /** First line of the error, without anything that looks like a password. */
    private function shortError(Throwable $e): string
    {
        $message = strtok($e->getMessage(), "\n") ?: class_basename($e);
        $password = (string) config('database.connections.'.config('database.default').'.password');

        return $password !== '' ? str_replace($password, '***', $message) : $message;
    }
}
