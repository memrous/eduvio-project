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
            // Údaje o studentovi z POST /stag/sync-student; předměty, rozvrh a výsledky zůstávají
            'stag_display_name'         => null,
            'study_program'             => null,
            'study_program_code'        => null,
            'faculty'                   => null,
            'study_form'                => null,
            'study_type'                => null,
            'study_type_key'            => null,
            'study_year'                => null,
            'study_status'              => null,
            'study_officer_name'        => null,
            'study_officer_email'       => null,
            'study_officer_phone'       => null,
            'study_info_synced_at'      => null,
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
                'message' => 'A sync is already in progress.',
            ], 429);
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
        ]);
    }
}
