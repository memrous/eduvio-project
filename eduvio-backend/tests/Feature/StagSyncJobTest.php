<?php

namespace Tests\Feature;

use App\Jobs\StagSyncJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StagSyncJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_ignores_stag_fields_and_does_not_dispatch_job(): void
    {
        Queue::fake();

        // STAG is connected later from the profile via ticket login, never at registration.
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'johndoe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'stag_student_id' => 'S12345',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('user.stag_connected', false);

        $user = User::where('email', 'john@example.com')->firstOrFail();
        $this->assertNull($user->stag_student_id);

        Queue::assertNotPushed(StagSyncJob::class);
    }

    public function test_registration_does_not_dispatch_job_without_stag_fields(): void
    {
        Queue::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'johndoe',
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201);

        Queue::assertNotPushed(StagSyncJob::class);
    }

    public function test_job_execution_updates_status_and_deletes_token(): void
    {
        $user = User::create([
            'name' => 'John Doe',
            'username' => 'johndoe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'stag_student_id' => 'S12345',
            'stag_ticket' => null,
        ]);

        // Dispatch synchronously — without a ticket the job must fail fast
        StagSyncJob::dispatchSync($user);

        // Assert that the token was revoked/deleted
        $this->assertEquals(0, $user->tokens()->where('name', 'stag-sync')->count());

        // Refresh user and assert status
        $user->refresh();
        $this->assertEquals('failed', $user->stag_sync_status);
        $this->assertNotNull($user->stag_sync_error);
    }
}
