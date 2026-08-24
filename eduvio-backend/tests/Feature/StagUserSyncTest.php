<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class StagUserSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_adds_columns_and_encrypts_existing_passwords(): void
    {
        // 1. Rollback 2 steps:
        //    step 1 = stag_last_sync_attempt_at (most recent)
        //    step 2 = stag_sync_status / stag_sync_error / stag_synced_at (the one we're testing)
        Artisan::call('migrate:rollback', ['--step' => 2]);

        // Assert stag_sync_status columns do not exist after rollback
        $this->assertFalse(Schema::hasColumn('users', 'stag_sync_status'));
        $this->assertFalse(Schema::hasColumn('users', 'stag_sync_error'));
        $this->assertFalse(Schema::hasColumn('users', 'stag_synced_at'));

        // 2. Insert a user with a raw plaintext password directly using DB to bypass Eloquent casts
        DB::table('users')->insert([
            'name'          => 'Test User',
            'username'      => 'testuser',
            'email'         => 'test@example.com',
            'password'      => bcrypt('password'),
            'stag_password' => 'my-plaintext-password-123',
        ]);

        // Verify it is plaintext in the database
        $userRaw = DB::table('users')->first();
        $this->assertEquals('my-plaintext-password-123', $userRaw->stag_password);

        // 3. Run migrate up (adds stag_sync_status + stag_last_sync_attempt_at)
        Artisan::call('migrate');

        // Assert columns now exist
        $this->assertTrue(Schema::hasColumn('users', 'stag_sync_status'));
        $this->assertTrue(Schema::hasColumn('users', 'stag_sync_error'));
        $this->assertTrue(Schema::hasColumn('users', 'stag_synced_at'));

        // 4. Verify that the user's password in the database is now encrypted
        $userRawAfter = DB::table('users')->first();
        $this->assertNotEquals('my-plaintext-password-123', $userRawAfter->stag_password);
        $this->assertEquals('my-plaintext-password-123', Crypt::decryptString($userRawAfter->stag_password));

        // 5. Verify Eloquent casts decrypt it automatically
        $userEloquent = User::first();
        $this->assertEquals('my-plaintext-password-123', $userEloquent->stag_password);

        // 6. Test rollback (down) for the stag_sync_status migration only (step 2 from current tip):
        //    step 1 = stag_last_sync_attempt_at, step 2 = stag_sync_status
        Artisan::call('migrate:rollback', ['--step' => 2]);

        $userRawRolledBack = DB::table('users')->first();
        $this->assertEquals('my-plaintext-password-123', $userRawRolledBack->stag_password);
        $this->assertFalse(Schema::hasColumn('users', 'stag_sync_status'));

        // Restore migrations so RefreshDatabase teardown works cleanly
        Artisan::call('migrate');
    }

    public function test_user_model_casts_and_hidden_fields(): void
    {
        // Setup a user
        $user = User::create([
            'name' => 'Stag User',
            'username' => 'staguser',
            'email' => 'stag@example.com',
            'password' => 'secret123',
            'stag_password' => 'secure-stag-pass',
            'stag_sync_status' => 'success',
            'stag_sync_error' => 'No errors here',
            'stag_synced_at' => now(),
        ]);

        // Refresh from DB
        $user->refresh();

        // 1. Assert encrypted casts work
        $rawPasswordInDb = DB::table('users')->where('id', $user->id)->value('stag_password');
        $this->assertNotEquals('secure-stag-pass', $rawPasswordInDb);
        $this->assertEquals('secure-stag-pass', Crypt::decryptString($rawPasswordInDb));
        $this->assertEquals('secure-stag-pass', $user->stag_password);

        // 2. Assert hidden fields are not in array/json representation
        $array = $user->toArray();
        $this->assertArrayNotHasKey('stag_password', $array);
        $this->assertArrayNotHasKey('stag_sync_error', $array);

        // Assert fillable fields are in array representation
        $this->assertArrayHasKey('stag_sync_status', $array);
        $this->assertArrayHasKey('stag_synced_at', $array);
        $this->assertEquals('success', $array['stag_sync_status']);
    }
}
