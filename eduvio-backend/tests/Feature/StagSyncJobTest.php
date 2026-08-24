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

    public function test_registration_dispatches_stag_sync_job_when_credentials_present(): void
    {
        Queue::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'johndoe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'stag_username' => 'stag_user_123',
            'stag_password' => 'stag_pass_123',
            'stag_student_id' => 'S12345',
        ]);

        $response->assertStatus(201);

        Queue::assertPushed(StagSyncJob::class, function ($job) {
            return $job->user->email === 'john@example.com';
        });
    }

    public function test_registration_does_not_dispatch_job_when_credentials_missing(): void
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
            'stag_username' => 'stag_user_123',
            'stag_password' => 'stag_pass_123',
            'stag_student_id' => 'S12345',
        ]);

        // Dispatch synchronously
        StagSyncJob::dispatchSync($user);

        // Assert that the token was revoked/deleted
        $this->assertEquals(0, $user->tokens()->where('name', 'stag-sync')->count());

        // Refresh user and assert status
        $user->refresh();
        $this->assertEquals('failed', $user->stag_sync_status);
        $this->assertNotNull($user->stag_sync_error);
    }
}
