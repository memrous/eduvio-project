<?php

namespace Tests\Feature;

use App\Jobs\MoodleSyncJob;
use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ScheduleTest extends TestCase
{
    use RefreshDatabase;

    private function scheduledEvent(string $name): Event
    {
        $event = collect(app(Schedule::class)->events())->first(fn (Event $e) => $e->description === $name);
        $this->assertNotNull($event, "{$name} is not scheduled");

        return $event;
    }

    public function test_moodle_sync_runs_nightly_for_connected_users_only(): void
    {
        Queue::fake();
        $connected = User::factory()->create(['moodle_wstoken' => 'token-a', 'moodle_sync_status' => 'success']);
        User::factory()->create(['moodle_wstoken' => null]);
        User::factory()->create(['moodle_wstoken' => 'token-b', 'moodle_sync_status' => 'pending']);

        $event = $this->scheduledEvent('moodle-nightly-sync');
        $this->assertSame('0 3 * * *', $event->expression);
        $this->assertTrue($event->withoutOverlapping);

        $event->run($this->app);

        Queue::assertPushed(MoodleSyncJob::class, 1);
        Queue::assertPushed(MoodleSyncJob::class, fn (MoodleSyncJob $job) => $job->user->is($connected));
        Queue::assertNotPushed(StagSyncJob::class);
    }
}
