<?php

namespace App\Http\Controllers;

use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StagAuthController extends Controller
{
    /**
     * Vygeneruje state token a vrací URL pro přesměrování na STAG login.
     */
    public function redirect(Request $request): JsonResponse
    {
        $state = Str::random(40);
        Cache::put("stag_state:{$state}", $request->user()->id, now()->addMinutes(10));

        $callbackBase = env('STAG_CALLBACK_URL', config('app.url'));
        $callbackUrl = rtrim($callbackBase, '/') . '/stag/callback?state=' . $state;

        $stagLoginUrl = rtrim(config('stag.ws_base_url'), '/')
            . '/login?originalURL=' . urlencode($callbackUrl)
            . '&longTicket=1';

        return response()->json([
            'redirect_url' => $stagLoginUrl,
        ]);
    }

    /**
     * Veřejný callback endpoint volaný ze STAGu po přihlášení uživatele.
     */
    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim(config('stag.frontend_url', 'http://localhost:5173'), '/');

        $state = $request->query('state');
        $stagUserTicket = $request->query('stagUserTicket');
        $stagUserInfoRaw = $request->query('stagUserInfo');

        // 1. Ověření state a jednorázové vytažení user_id z cache
        $userId = Cache::pull("stag_state:{$state}");
        if (!$userId) {
            return redirect("{$frontendUrl}/profile?stag=error&reason=state_invalid");
        }

        // 2. Uživatel zrušil přihlášení nebo ticket chybí
        if (empty($stagUserTicket) || $stagUserTicket === 'anonymous') {
            return redirect("{$frontendUrl}/profile?stag=error&reason=cancelled");
        }

        try {
            // 3. Dekódování base64 JSON informací o uživateli
            $decodedJson = base64_decode($stagUserInfoRaw, true);
            if ($decodedJson === false) {
                throw new \RuntimeException('Failed to base64_decode stagUserInfo');
            }

            $decoded = json_decode($decodedJson, true);
            if (!is_array($decoded)) {
                throw new \RuntimeException('Failed to json_decode stagUserInfo');
            }

            // 4. Vyhledání role studenta (role === 'ST')
            $items = isset($decoded['stagUserInfo']) && is_array($decoded['stagUserInfo'])
                ? $decoded['stagUserInfo']
                : (isset($decoded[0]) ? $decoded : [$decoded]);

            $studentRole = null;
            foreach ($items as $item) {
                if (is_array($item) && ($item['role'] ?? null) === 'ST') {
                    $studentRole = $item;
                    break;
                }
            }

            if (!$studentRole) {
                return redirect("{$frontendUrl}/profile?stag=error&reason=no_student_role");
            }

            $userName = $studentRole['userName'] ?? null;
            $osCislo = $studentRole['osCislo'] ?? null;

            // 5. Uložení údajů a zahájení synchronizace
            $user = User::findOrFail($userId);
            $user->update([
                'stag_ticket'               => $stagUserTicket,
                'stag_ticket_expires_at'    => now()->addDays(90),
                'stag_user_name'            => $userName,
                'stag_student_id'           => $osCislo,
                'stag_sync_status'          => 'pending',
                'stag_sync_error'           => null,
                'stag_last_sync_attempt_at' => now(),
            ]);

            StagSyncJob::dispatch($user);

            return redirect("{$frontendUrl}/profile?stag=connected");
        } catch (\Throwable $e) {
            Log::error("STAG auth callback failed for user {$userId}: " . $e->getMessage(), [
                'exception' => $e,
                'user_id'   => $userId,
            ]);

            return redirect("{$frontendUrl}/profile?stag=error&reason=unexpected");
        }
    }
}
