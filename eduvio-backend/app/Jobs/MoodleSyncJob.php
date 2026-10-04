<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Moodle\MoodleApiException;
use App\Services\Moodle\MoodleClient;
use App\Services\Moodle\MoodleRequirementSync;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class MoodleSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 90;

    public User $user;

    /**
     * Create a new job instance.
     */
    public function __construct(User $user)
    {
        $this->user = $user;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if (empty($this->user->moodle_wstoken)) {
            $this->user->update([
                'moodle_sync_status' => 'failed',
                'moodle_sync_error'  => 'Moodle token missing, please reconnect.',
            ]);
            return;
        }

        // Step 1 — Set status to pending
        $this->user->update([
            'moodle_sync_status' => 'pending',
            'moodle_sync_error'  => null,
        ]);

        try {
            // Step 2 — Fetch assignments from Moodle Web Services and upsert requirements
            $client = new MoodleClient((string) config('moodle.base_url'), $this->user->moodle_wstoken);
            $processed = app(MoodleRequirementSync::class)->sync($this->user, $client);

            // Step 3 — Mark success
            $this->user->update([
                'moodle_sync_status' => 'success',
                'moodle_sync_error'  => null,
                'moodle_synced_at'   => now(),
            ]);
            Log::info("Moodle sync success for user {$this->user->id} ({$processed} assignments)");
        } catch (MoodleApiException $e) {
            $error = $e->errorcode === 'invalidtoken'
                ? 'Moodle token expired or revoked, please reconnect.'
                : $this->safeError($e->getMessage());

            $this->user->update([
                'moodle_sync_status' => 'failed',
                'moodle_sync_error'  => $error,
            ]);
            Log::error("Moodle sync failed for user {$this->user->id} [{$e->errorcode}]: {$error}");
        } catch (\Throwable $e) {
            $error = $this->safeError($e->getMessage());

            $this->user->update([
                'moodle_sync_status' => 'failed',
                'moodle_sync_error'  => $error,
            ]);
            Log::error("MoodleSyncJob exception for user {$this->user->id}: {$error}");
        }
    }

    /**
     * Truncate an error message and make sure the wstoken never leaks into it.
     */
    private function safeError(string $message): string
    {
        $token = (string) $this->user->moodle_wstoken;
        if ($token !== '') {
            $message = str_replace($token, '***', $message);
        }

        return mb_substr($message, 0, 500);
    }
}
