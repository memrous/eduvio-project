<?php

namespace App\Http\Controllers;

use App\Jobs\DepartmentLinksSyncJob;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Manual refresh of course page links found on department websites.
 */
class DepartmentLinksController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        return response()->json($this->statusPayload($request->user()));
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // 422 — no subjects of a supported department
        if (DepartmentLinksSyncJob::allowedSubjects($user)->isEmpty()) {
            return response()->json([
                'message' => 'No subjects of a supported department.',
            ], 422);
        }

        // 429 — already running or cooldown not elapsed
        $payload = $this->statusPayload($user);
        if ($payload['status'] === 'pending' || $payload['retry_after_seconds'] > 0) {
            return response()->json(array_merge($payload, [
                'message' => $payload['status'] === 'pending'
                    ? 'A refresh is already in progress.'
                    : 'Please wait before refreshing again.',
            ]), 429);
        }

        Cache::put($this->lastRefreshKey($user), now()->timestamp, now()->addMinutes($this->cooldownMinutes()));
        Cache::put(DepartmentLinksSyncJob::statusKey($user->id), ['status' => 'pending', 'finished_at' => null], now()->addDays(30));

        DepartmentLinksSyncJob::dispatch($user);

        return response()->json($this->statusPayload($user), 202);
    }

    private function statusPayload(User $user): array
    {
        $state = Cache::get(DepartmentLinksSyncJob::statusKey($user->id), []);
        $lastRefresh = Cache::get($this->lastRefreshKey($user));

        $nextAllowedAt = $lastRefresh
            ? Carbon::createFromTimestamp($lastRefresh)->addMinutes($this->cooldownMinutes())
            : null;
        $retryAfter = $nextAllowedAt && $nextAllowedAt->isFuture()
            ? (int) ceil(now()->diffInSeconds($nextAllowedAt))
            : 0;

        return [
            'supported'           => DepartmentLinksSyncJob::allowedSubjects($user)->isNotEmpty(),
            'status'              => $state['status'] ?? 'idle',
            'finished_at'         => $state['finished_at'] ?? null,
            'next_allowed_at'     => $retryAfter > 0 ? $nextAllowedAt->toIso8601String() : null,
            'retry_after_seconds' => $retryAfter,
        ];
    }

    private function lastRefreshKey(User $user): string
    {
        return "department-links:last-refresh:{$user->id}";
    }

    private function cooldownMinutes(): int
    {
        return (int) config('departments.refresh_cooldown_minutes', 30);
    }
}
