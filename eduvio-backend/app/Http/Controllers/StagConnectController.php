<?php

namespace App\Http\Controllers;

use App\Jobs\StagSyncJob;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class StagConnectController extends Controller
{
    public function connect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stag_student_id' => 'required|string|max:255',
            'stag_username'   => 'required|string|max:255',
            'stag_password'   => 'required|string',
        ]);

        $user = $request->user();

        $user->update([
            'stag_student_id'           => $validated['stag_student_id'],
            'stag_username'             => $validated['stag_username'],
            'stag_password'             => $validated['stag_password'], // encrypted cast handles this
            'stag_sync_status'          => 'pending',
            'stag_sync_error'           => null,
            'stag_synced_at'            => null,
            'stag_last_sync_attempt_at' => now(),
        ]);

        StagSyncJob::dispatch($user);

        return response()->json([
            'user'           => $user->fresh(),
            'message'        => 'STAG credentials saved. Sync started in background.',
            'next_allowed_at' => $this->nextAllowedAt($user->fresh()),
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->update([
            'stag_student_id'           => null,
            'stag_username'             => null,
            'stag_password'             => null,
            'stag_sync_status'          => null,
            'stag_sync_error'           => null,
            'stag_synced_at'            => null,
            'stag_last_sync_attempt_at' => null,
        ]);

        return response()->json([
            'user'    => $request->user()->fresh(),
            'message' => 'IS/STAG disconnected.',
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'stag_sync_status' => $user->stag_sync_status,
            'stag_synced_at'   => $user->stag_synced_at,
            'next_allowed_at'  => $this->nextAllowedAt($user),
            // stag_sync_error is in $hidden — never returned here
        ]);
    }

    public function resync(Request $request): JsonResponse
    {
        $user = $request->user();

        // 422 — STAG not connected
        if (! $user->stag_student_id) {
            return response()->json([
                'message' => 'STAG is not connected.',
            ], 422);
        }

        // 429 — sync already running
        if ($user->stag_sync_status === 'pending') {
            return response()->json([
                'message'             => 'A sync is already in progress.',
                'retry_after_seconds' => null,
                'next_allowed_at'     => $this->nextAllowedAt($user),
            ], 429);
        }

        // 429 — cooldown not elapsed
        $cooldown = (int) config('stag.resync_cooldown_minutes', 30);
        if ($user->stag_last_sync_attempt_at !== null) {
            $elapsedSeconds   = now()->timestamp - $user->stag_last_sync_attempt_at->timestamp;
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
            'stag_sync_status'          => 'pending',
            'stag_last_sync_attempt_at' => now(),
        ]);

        StagSyncJob::dispatch($user);

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
        if (! $user->stag_last_sync_attempt_at) {
            return null;
        }

        $cooldown = (int) config('stag.resync_cooldown_minutes', 30);

        return $user->stag_last_sync_attempt_at
            ->addMinutes($cooldown)
            ->toIso8601String();
    }
}
