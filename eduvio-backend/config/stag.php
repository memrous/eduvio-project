<?php

return [
    /*
    |--------------------------------------------------------------------------
    | STAG Resync Cooldown
    |--------------------------------------------------------------------------
    |
    | Number of minutes a user must wait between manual resync requests.
    | This prevents abuse of the resync endpoint.
    |
    */
    'resync_cooldown_minutes' => env('STAG_RESYNC_COOLDOWN_MINUTES', 30),

    /*
    |--------------------------------------------------------------------------
    | STAG Web Services Base URL
    |--------------------------------------------------------------------------
    |
    | Base URL for IS/STAG Web Services endpoints.
    |
    */
    'ws_base_url' => env('STAG_WS_BASE_URL', 'https://stag-ws.upol.cz/ws'),

    /*
    |--------------------------------------------------------------------------
    | Frontend URL
    |--------------------------------------------------------------------------
    |
    | Frontend application URL used for browser redirects after auth flow.
    |
    */
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
];
