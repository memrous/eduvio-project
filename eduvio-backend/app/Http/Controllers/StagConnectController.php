<?php

namespace App\Http\Controllers;

use App\Jobs\StagSyncJob;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Manages an existing STAG connection. Connecting itself happens via
 * StagAuthController::redirect/callback (ticket-based login).
 */
class StagConnectController extends Controller
{
    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->update([
            'stag_student_id'           => null,
            'stag_ticket'               => null,
            'stag_ticket_expires_at'    => null,
            'stag_user_name'            => null,
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

        $agentToken = $user->stagAgentTokens()->latest('id')->first();

        return response()->json([
            'mode'             => config('stag.mode'),
            'stag_connected'   => $user->stag_connected,
            'stag_sync_status' => $user->stag_sync_status,
            'stag_synced_at'   => $user->stag_synced_at,
            // Hidden from the user model; exposed here so the owner can see why a sync failed
            'stag_sync_error'  => $user->stag_sync_error,
            'next_allowed_at'  => $this->nextAllowedAt($user),
            // Metadata only — the plain token is returned solely when it is created
            'agent_token'      => $agentToken ? [
                'created_at'   => $agentToken->created_at?->toIso8601String(),
                'expires_at'   => $agentToken->expires_at?->toIso8601String(),
                'last_used_at' => $agentToken->last_used_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function resync(Request $request): JsonResponse
    {
        $user = $request->user();

        // 409 — in agent mode the local agent syncs, not the server
        if (config('stag.mode') === 'agent') {
            return response()->json([
                'error'   => 'agent_mode',
                'message' => 'STAG sync is performed by the local agent.',
            ], 409);
        }

        // 422 — STAG not connected (no ticket, or ticket expired)
        if (! $user->stag_connected) {
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
