<?php

namespace App\Http\Controllers;

use App\Jobs\MoodleSyncJob;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class MoodleConnectController extends Controller
{
    public function connectToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        $parts = explode(':::', $validated['token']);
        if (count($parts) !== 3) {
            return response()->json([
                'error'   => 'invalid_token_format',
                'message' => 'Invalid token format.',
            ], 422);
        }

        $wstoken = $parts[1];
        $baseUrl = rtrim(config('moodle.base_url'), '/');

        try {
            $response = Http::timeout(15)->get("{$baseUrl}/webservice/rest/server.php", [
                'wstoken'            => $wstoken,
                'moodlewsrestformat' => 'json',
                'wsfunction'         => 'core_webservice_get_site_info',
            ]);

            if (! $response->successful()) {
                return response()->json([
                    'error'   => 'token_validation_failed',
                    'message' => 'Token validation failed.',
                ], 422);
            }

            $data = $response->json();
            if (! is_array($data) || isset($data['exception']) || isset($data['errorcode'])) {
                return response()->json([
                    'error'   => 'token_validation_failed',
                    'message' => 'Token validation failed.',
                ], 422);
            }
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'token_validation_failed',
                'message' => 'Token validation failed.',
            ], 422);
        }

        $displayName = $data['fullname'] ?? $data['username'] ?? null;
        $moodleUserId = $data['userid'] ?? null;

        $user = $request->user();

        $user->update([
            'moodle_wstoken'              => $wstoken,
            'moodle_display_name'         => $displayName,
            'moodle_user_id'              => $moodleUserId,
            'moodle_sync_status'          => 'pending',
            'moodle_sync_error'           => null,
            'moodle_synced_at'            => null,
            'moodle_last_sync_attempt_at' => now(),
        ]);

        MoodleSyncJob::dispatch($user);

        return response()->json([
            'user'            => $user->fresh(),
            'message'         => 'Moodle credentials saved. Sync started in background.',
            'next_allowed_at' => $this->nextAllowedAt($user->fresh()),
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->update([
            'moodle_username'             => null,
            'moodle_password'             => null,
            'moodle_sync_status'          => null,
            'moodle_sync_error'           => null,
            'moodle_synced_at'            => null,
            'moodle_last_sync_attempt_at' => null,
        ]);

        return response()->json([
            'user'    => $request->user()->fresh(),
            'message' => 'Moodle disconnected.',
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'moodle_sync_status' => $user->moodle_sync_status,
            'moodle_synced_at'   => $user->moodle_synced_at,
            'next_allowed_at'  => $this->nextAllowedAt($user),
        ]);
    }

    public function resync(Request $request): JsonResponse
    {
        $user = $request->user();

        // 422 — Moodle not connected
        if (! $user->moodle_username) {
            return response()->json([
                'message' => 'Moodle is not connected.',
            ], 422);
        }

        // 429 — sync already running
        if ($user->moodle_sync_status === 'pending') {
            return response()->json([
                'message'             => 'A sync is already in progress.',
                'retry_after_seconds' => null,
                'next_allowed_at'     => $this->nextAllowedAt($user),
            ], 429);
        }

        // 429 — cooldown not elapsed
        $cooldown = (int) config('moodle.resync_cooldown_minutes', 30);
        if ($user->moodle_last_sync_attempt_at !== null) {
            $elapsedSeconds   = now()->timestamp - $user->moodle_last_sync_attempt_at->timestamp;
            $secondsRemaining = $cooldown * 60 - $elapsedSeconds;
            if ($secondsRemaining > 0) {
                return response()->json([
                    'message'             => "Please wait {$cooldown} minutes between syncs.",
                    'retry_after_seconds' => (int) ceil($secondsRemaining),
                    'next_allowed_at'     => $this->nextAllowedAt($user),
                ], 429);
            }
        }

        // All checks passed — dispatch job
        $user->update([
            'moodle_sync_status'          => 'pending',
            'moodle_last_sync_attempt_at' => now(),
        ]);

        MoodleSyncJob::dispatch($user);

        return response()->json([
            'user'            => $user->fresh(),
            'message'         => 'Resync started in background.',
            'next_allowed_at' => $this->nextAllowedAt($user->fresh()),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Compute the ISO timestamp when the next resync is allowed.
     * Returns null if the user has never attempted a sync.
     */
    private function nextAllowedAt($user): ?string
    {
        if (! $user->moodle_last_sync_attempt_at) {
            return null;
        }

        $cooldown = (int) config('moodle.resync_cooldown_minutes', 30);

        return $user->moodle_last_sync_attempt_at
            ->addMinutes($cooldown)
            ->toIso8601String();
    }
}
