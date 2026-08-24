<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class StagSyncJob implements ShouldQueue
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
        // Step 1 — Set status to pending
        $this->user->update([
            'stag_sync_status' => 'pending',
            'stag_sync_error'  => null,
        ]);

        try {
            // Step 2 — Generate a short-lived Sanctum token
            $plainToken = $this->user->createToken('stag-sync')->plainTextToken;

            // Step 3 — Resolve the Python script path
            $scriptPath = base_path('../stag_mock_import/test_import.py');

            // Step 4 — Build and run the Process
            $process = new Process(
                command: ['python3', $scriptPath],
                env: [
                    'LARAVEL_API_URL'  => env('STAG_CALLBACK_URL', config('app.url')) . '/api',
                    'BEARER_TOKEN'     => $plainToken,
                    'STAG_USERNAME'    => $this->user->stag_username,
                    'STAG_PASSWORD'    => $this->user->stag_password,
                    'STAG_STUDENT_ID'  => $this->user->stag_student_id,
                ],
                timeout: 60,
            );

            $process->run();

            // Step 5 — Handle success / failure
            // Always revoke the short-lived token after the script finishes
            $this->user->tokens()->where('name', 'stag-sync')->delete();

            if ($process->isSuccessful()) {
                $this->user->update([
                    'stag_sync_status' => 'success',
                    'stag_sync_error'  => null,
                    'stag_synced_at'   => now(),
                ]);
                Log::info("STAG sync success for user {$this->user->id}");
            } else {
                // Capture stderr but strip any token/password fragments before logging
                $rawError = $process->getErrorOutput() ?: $process->getOutput();
                $safeError = mb_substr($rawError, 0, 500); // truncate, never log full output

                $this->user->update([
                    'stag_sync_status' => 'failed',
                    'stag_sync_error'  => $safeError,
                ]);
                Log::error("STAG sync failed for user {$this->user->id}: {$safeError}");
            }
        } catch (\Throwable $e) {
            // Revoke the token even if an exception is thrown
            $this->user->tokens()->where('name', 'stag-sync')->delete();

            $this->user->update([
                'stag_sync_status' => 'failed',
                'stag_sync_error'  => mb_substr($e->getMessage(), 0, 500),
            ]);

            Log::error("StagSyncJob exception for user {$this->user->id}: " . $e->getMessage());
        }
    }
}
