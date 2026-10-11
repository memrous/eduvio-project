<?php

use App\Jobs\DepartmentLinksSyncJob;
use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Weekly check of course page links on department websites and of new files on linked pages
Schedule::call(function () {
    User::query()->each(fn (User $user) => DepartmentLinksSyncJob::dispatchForUser($user));
})->weekly()->name('department-links-sync')->withoutOverlapping();
