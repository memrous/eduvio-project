<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Login and registration: 5 attempts a minute per IP and e-mail
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        if ($this->app->environment('local')) {
            $link = public_path('storage');
            $target = storage_path('app/public');

            if (!is_link($link) || realpath($link) !== realpath($target)) {
                \Illuminate\Support\Facades\Log::warning("Storage symlink missing - run `php artisan storage:link`");
            }
        }
    }
}
