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
];
