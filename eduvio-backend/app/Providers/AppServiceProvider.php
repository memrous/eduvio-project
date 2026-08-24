<?php

namespace App\Providers;

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
        if ($this->app->environment('local')) {
            $link = public_path('storage');
            $target = storage_path('app/public');

            if (!is_link($link) || realpath($link) !== realpath($target)) {
                \Illuminate\Support\Facades\Log::warning("Storage symlink missing - run `php artisan storage:link`");
            }
        }
    }
}
