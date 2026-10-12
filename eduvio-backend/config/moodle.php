<?php

return [
    'base_url' => env('MOODLE_BASE_URL', 'https://moodle.upol.cz'),

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
