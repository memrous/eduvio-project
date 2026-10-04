<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Moodle\MoodleApiException;
use App\Services\Moodle\MoodleClient;
use App\Services\Moodle\MoodleMaterialSync;
use App\Services\Moodle\MoodleRequirementSync;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use RuntimeException;

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
            if (empty($this->user->moodle_user_id)) {
                throw new RuntimeException('Moodle user id missing, please reconnect.');
            }

            // Step 2 — Fetch the enrolled courses once and share them between both syncs
            $client = new MoodleClient((string) config('moodle.base_url'), $this->user->moodle_wstoken);
            $courses = $client->call('core_enrol_get_users_courses', [
                'userid' => $this->user->moodle_user_id,
            ]);

            // Step 3 — Upsert assignments as requirements, then course contents as materials
            $assignments = app(MoodleRequirementSync::class)->sync($this->user, $client, $courses);
            $materials = app(MoodleMaterialSync::class)->sync($this->user, $client, $courses);

            // Step 4 — Mark success
            $this->user->update([
                'moodle_sync_status' => 'success',
                'moodle_sync_error'  => null,
                'moodle_synced_at'   => now(),
            ]);
            Log::info("Moodle sync success for user {$this->user->id} ({$assignments} assignments, {$materials} materials)");
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
