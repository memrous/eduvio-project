<?php

namespace App\Http\Controllers;

use App\Jobs\MoodleSyncJob;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MoodleConnectController extends Controller
{
    public function connect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'moodle_username' => 'required|string|max:255',
            'moodle_password' => 'required|string',
        ]);

        $user = $request->user();

        $user->update([
            'moodle_username'             => $validated['moodle_username'],
            'moodle_password'             => $validated['moodle_password'],
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
