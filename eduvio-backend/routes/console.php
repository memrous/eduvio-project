<?php

use App\Jobs\DepartmentLinksSyncJob;
use App\Jobs\MoodleSyncJob;
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

// Nightly Moodle sync for users with a connected Moodle; jobs one minute apart so
// Moodle is not hit by everyone at once. A sync that is still running is skipped.
// STAG is not scheduled: in agent mode the student's local agent syncs it.
Schedule::call(function () {
    $index = 0;
    User::query()
        ->whereNotNull('moodle_wstoken')
        ->where(fn ($q) => $q->whereNull('moodle_sync_status')->orWhere('moodle_sync_status', '!=', 'pending'))
        ->orderBy('id')
        ->each(function (User $user) use (&$index) {
            MoodleSyncJob::dispatch($user)->delay(now()->addMinutes($index++));
        });
})->dailyAt('03:00')->name('moodle-nightly-sync')->withoutOverlapping();
