<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Self-registration
    |--------------------------------------------------------------------------
    |
    | Off by default: a production deployment for a known set of users keeps
    | it off (POST /api/register answers 403). Turn it on locally.
    |
    */
    'enabled' => (bool) env('REGISTRATION_ENABLED', false),

    /*
    | Optional comma-separated e-mail domains allowed to register, e.g.
    | "upol.cz,student.upol.cz". Empty = any domain.
    */
    'allowed_domains' => array_values(array_filter(array_map(
        fn (string $domain) => strtolower(trim($domain)),
        explode(',', (string) env('REGISTRATION_ALLOWED_DOMAINS', ''))
    ))),
];
