<?php

namespace App\Http\Controllers;

use App\Jobs\MoodleSyncJob;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MoodleConnectController extends Controller
{
    /**
     * Issue a server-side passport and return the Moodle mobile launch URL.
     * Starting a new launch replaces any previous one.
     */
    public function startLaunch(Request $request): JsonResponse
    {
        $passport = Str::random(32);
        $ttl = (int) config('moodle.launch_ttl_minutes', 15);

        $request->user()->update([
            'moodle_launch_passport'   => $passport,
            'moodle_launch_expires_at' => now()->addMinutes($ttl),
        ]);

        $baseUrl = rtrim(config('moodle.base_url'), '/');
        $query = http_build_query([
            'service'   => 'moodle_mobile_app',
            'passport'  => $passport,
            'urlscheme' => config('moodle.launch_urlscheme', 'web+eduvio'),
        ], '', '&', PHP_QUERY_RFC3986);

        return response()->json([
            'launch_url' => "{$baseUrl}/admin/tool/mobile/launch.php?{$query}",
        ]);
    }

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

        $user = $request->user();
        $baseUrl = rtrim(config('moodle.base_url'), '/');

        // The token must belong to a launch this user started: Moodle signs it
        // as md5(wwwroot . passport), so verify before ever calling Moodle.
        $passport = $user->moodle_launch_passport;
        $expiresAt = $user->moodle_launch_expires_at;
        if (! $passport || ! $expiresAt || $expiresAt->isPast()) {
            return response()->json([
                'error'   => 'launch_not_started',
                'message' => 'Moodle launch was not started or has expired.',
            ], 422);
        }

        $expectedSignature = md5($baseUrl . $passport);
        if (! hash_equals($expectedSignature, strtolower($parts[0]))) {
            return response()->json([
                'error'   => 'invalid_signature',
                'message' => 'Token does not belong to this launch.',
            ], 422);
        }

        $wstoken = $parts[1];

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

        $user->update([
            'moodle_wstoken'              => $wstoken,
            'moodle_display_name'         => $displayName,
            'moodle_user_id'              => $moodleUserId,
            'moodle_launch_passport'      => null,
            'moodle_launch_expires_at'    => null,
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
            'moodle_wstoken'              => null,
            'moodle_display_name'         => null,
            'moodle_user_id'              => null,
            'moodle_launch_passport'      => null,
            'moodle_launch_expires_at'    => null,
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
            'moodle_connected'   => $user->moodle_connected,
            'moodle_sync_status' => $user->moodle_sync_status,
            'moodle_synced_at'   => $user->moodle_synced_at,
            'next_allowed_at'  => $this->nextAllowedAt($user),
        ]);
    }

    public function resync(Request $request): JsonResponse
    {
        $user = $request->user();

        // 422 — Moodle not connected
        if (! $user->moodle_wstoken) {
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
