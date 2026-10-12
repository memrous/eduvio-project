<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

/** Public settings the frontend needs before login (e.g. whether to offer registration). */
class AppConfigController extends Controller
{
    // GET /api/config
    public function show(): JsonResponse
    {
        return response()->json([
            'registration' => [
                'enabled'         => (bool) config('registration.enabled'),
                'allowed_domains' => config('registration.allowed_domains', []),
            ],
        ]);
    }
}
