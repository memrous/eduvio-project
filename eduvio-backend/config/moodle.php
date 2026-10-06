<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Moodle Resync Cooldown
    |--------------------------------------------------------------------------
    |
    | Number of minutes a user must wait between manual resync requests.
    | This prevents abuse of the resync endpoint.
    |
    */
    'resync_cooldown_minutes' => env('MOODLE_RESYNC_COOLDOWN_MINUTES', 30),
    'base_url'                => env('MOODLE_BASE_URL', 'https://moodle.upol.cz'),

    /*
    |--------------------------------------------------------------------------
    | Moodle Mobile Launch
    |--------------------------------------------------------------------------
    |
    | URL scheme Moodle redirects back to after tool/mobile/launch.php, and
    | how long a server-issued launch passport stays valid.
    |
    */
    'launch_urlscheme'        => env('MOODLE_LAUNCH_URLSCHEME', 'web+eduvio'),
    'launch_ttl_minutes'      => env('MOODLE_LAUNCH_TTL_MINUTES', 15),
];
