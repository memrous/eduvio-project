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
];
