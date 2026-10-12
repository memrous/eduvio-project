<?php

namespace App\Http\Controllers;

use App\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * GET /api/health — manual check after a deploy: database, materials disk and the
 * queue backlog. Answers only "ok" / "fail"; details go to the server log.
 * (The keep-alive ping uses /up, which touches neither the DB nor the disk.)
 */
class HealthController extends Controller
{
    private const PROBE_FILE = 'health/.probe';

    public function show(): JsonResponse
    {
        $db = $this->check('db', fn () => DB::select('select 1'));
        $storage = $this->check('storage', function () {
            $disk = Material::filesDisk();
            if (! $disk->put(self::PROBE_FILE, now()->toIso8601String()) || ! $disk->delete(self::PROBE_FILE)) {
                throw new \RuntimeException('Writing or deleting the probe file failed.');
            }
        });

        return response()->json([
            'db'            => $db ? 'ok' : 'fail',
            'storage'       => $storage ? 'ok' : 'fail',
            'queue_pending' => $db ? $this->queuePending() : null,
        ], $db && $storage ? 200 : 503);
    }

    private function check(string $name, callable $probe): bool
    {
        try {
            $probe();

            return true;
        } catch (Throwable $e) {
            Log::warning("Health check {$name} failed: ".$e->getMessage());

            return false;
        }
    }

    /** Jobs waiting in the database queue (null for other queue drivers). */
    private function queuePending(): ?int
    {
        if (config('queue.default') !== 'database') {
            return null;
        }

        try {
            return DB::table(config('queue.connections.database.table', 'jobs'))->count();
        } catch (Throwable) {
            return null;
        }
    }
}
