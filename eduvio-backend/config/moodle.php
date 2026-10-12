<?php

return [
    'base_url' => env('MOODLE_BASE_URL', 'https://moodle.upol.cz'),

    /*
    |--------------------------------------------------------------------------
    | Moodle Mobile Launch
    |--------------------------------------------------------------------------
    |
    | URL scheme Moodle redirects back to after tool/mobile/launch.php, and
    | how long a server-issued launch passport stays valid. The frontend
    | registers its protocol handler for the same scheme, so local
    | development (web+eduviodev) and production (web+eduvio) don't
    | overwrite each other's handler. Only "web+" followed by a-z is a
    | valid custom scheme; anything else falls back to web+eduvio.
    |
    */
    'launch_urlscheme'        => preg_match('/^web\+[a-z]+$/D', (string) env('MOODLE_LAUNCH_URLSCHEME', '')) === 1
        ? env('MOODLE_LAUNCH_URLSCHEME')
        : 'web+eduvio',
    'launch_ttl_minutes'      => env('MOODLE_LAUNCH_TTL_MINUTES', 15),
];
