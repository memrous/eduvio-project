<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Department Websites
    |--------------------------------------------------------------------------
    |
    | Departments (STAG "katedra" code) whose staff pages are searched for
    | links to course pages. Only subjects of these departments are synced.
    |
    */
    'allowed' => [
        'KMI' => [
            'base_url' => env('DEPARTMENT_KMI_BASE_URL', 'https://www.inf.upol.cz'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Crawler Etiquette
    |--------------------------------------------------------------------------
    |
    | Contact shown in the User-Agent ("EduvioBot/1.0 (+contact)"), request
    | timeout, minimal pause between requests, and how long fetched pages
    | stay cached (shared by all users).
    |
    */
    'contact'                 => env('DEPARTMENT_BOT_CONTACT', env('APP_URL', 'http://localhost')),
    'timeout_seconds'         => env('DEPARTMENT_HTTP_TIMEOUT', 10),
    'min_request_interval_ms' => env('DEPARTMENT_MIN_REQUEST_INTERVAL_MS', 1000),
    'cache_ttl_hours'         => env('DEPARTMENT_CACHE_TTL_HOURS', 24),
    'max_redirects'           => 5,

    // Pages are fetched only from these hosts (and their subdomains), e.g.
    // personal pages like outrata.inf.upol.cz or phoenix.inf.upol.cz.
    'fetch_host_suffixes'     => ['upol.cz'],

    /*
    |--------------------------------------------------------------------------
    | Manual Refresh Cooldown
    |--------------------------------------------------------------------------
    */
    'refresh_cooldown_minutes' => env('DEPARTMENT_REFRESH_COOLDOWN_MINUTES', 30),
];
