<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects personal access tokens restricted to specific abilities (e.g. the
 * "stag-agent" token with only "stag:sync"). Such tokens may only reach the
 * routes that explicitly allow their ability; everything else needs "*".
 */
class EnsureFullAccessToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken && ! $token->can('*')) {
            return response()->json([
                'message' => 'This token is not allowed to access this endpoint.',
            ], 403);
        }

        return $next($request);
    }
}
