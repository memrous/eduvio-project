<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * STAG agent: a script on the user's machine (inside the UPOL network) that
 * pulls data from STAG WS and pushes it to the API with a restricted token.
 */
class StagAgentController extends Controller
{
    /**
     * Issue a new agent token (replacing any previous one). The plain token is
     * returned only here, exactly once.
     */
    public function createToken(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->stagAgentTokens()->delete();

        $expiresAt = now()->addDays((int) config('stag.agent_token_ttl_days', 180));
        $newToken = $user->createToken(User::STAG_AGENT_TOKEN, ['stag:sync'], $expiresAt);

        return response()->json([
            'token'      => $newToken->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
        ], 201);
    }

    public function revokeToken(Request $request): JsonResponse
    {
        $request->user()->stagAgentTokens()->delete();

        return response()->json([
            'message' => 'STAG agent token revoked.',
        ]);
    }

    /**
     * Agent reports the outcome of a sync run it performed.
     */
    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:success,failed',
            'error'  => 'nullable|string',
        ]);

        $user = $request->user();

        if ($validated['status'] === 'success') {
            $user->update([
                'stag_sync_status' => 'success',
                'stag_sync_error'  => null,
                'stag_synced_at'   => now(),
            ]);
        } else {
            $error = $validated['error'] ?? null;

            $user->update([
                'stag_sync_status' => 'failed',
                'stag_sync_error'  => $error !== null ? mb_substr($error, 0, 500) : null,
            ]);
        }

        return response()->json([
            'stag_sync_status' => $user->stag_sync_status,
            'stag_synced_at'   => $user->stag_synced_at,
        ]);
    }

    /**
     * Lets the agent verify its token and that it talks to the right server.
     */
    public function whoami(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'name'  => $user->name,
            'email' => $user->email,
        ]);
    }
}
