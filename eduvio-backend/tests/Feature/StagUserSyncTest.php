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

    /**
     * The migration under test (adds stag_sync_* columns).
     * Rolled back by path so the test does not depend on how many migrations follow it.
     */
    private const STAG_SYNC_MIGRATION = 'database/migrations/2026_06_29_000001_add_stag_sync_status_to_users_table.php';

    /**
     * Later migration that drops the legacy STAG credential columns the sync migration
     * still references in down(); it has to be rolled back first.
     */
    private const STAG_CREDENTIALS_REMOVAL_MIGRATION = 'database/migrations/2026_10_06_000002_remove_stag_credentials_from_users_table.php';

    public function test_migration_adds_stag_sync_columns(): void
    {
        // 1. Roll back the stag_sync_status / stag_sync_error / stag_synced_at migration
        Artisan::call('migrate:rollback', ['--path' => [
            self::STAG_CREDENTIALS_REMOVAL_MIGRATION,
            self::STAG_SYNC_MIGRATION,
        ]]);

        // Assert stag_sync_status columns do not exist after rollback
        $this->assertFalse(Schema::hasColumn('users', 'stag_sync_status'));
        $this->assertFalse(Schema::hasColumn('users', 'stag_sync_error'));
        $this->assertFalse(Schema::hasColumn('users', 'stag_synced_at'));

        // 2. Run migrate up (re-applies only the rolled back migrations)
        Artisan::call('migrate');

        // Assert columns now exist
        $this->assertTrue(Schema::hasColumn('users', 'stag_sync_status'));
        $this->assertTrue(Schema::hasColumn('users', 'stag_sync_error'));
        $this->assertTrue(Schema::hasColumn('users', 'stag_synced_at'));
    }

    public function test_user_model_casts_and_hidden_fields(): void
    {
        // Setup a user
        $user = User::create([
            'name' => 'Stag User',
            'username' => 'staguser',
            'email' => 'stag@example.com',
            'password' => 'secret123',
            'stag_ticket' => 'secure-stag-ticket',
            'stag_ticket_expires_at' => now()->addDays(30),
            'stag_sync_status' => 'success',
            'stag_sync_error' => 'No errors here',
            'stag_synced_at' => now(),
        ]);

        // Refresh from DB
        $user->refresh();

        // 1. Assert encrypted casts work
        $rawTicketInDb = DB::table('users')->where('id', $user->id)->value('stag_ticket');
        $this->assertNotEquals('secure-stag-ticket', $rawTicketInDb);
        $this->assertEquals('secure-stag-ticket', Crypt::decryptString($rawTicketInDb));
        $this->assertEquals('secure-stag-ticket', $user->stag_ticket);

        // 2. Assert hidden fields are not in array/json representation
        $array = $user->toArray();
        $this->assertArrayNotHasKey('stag_ticket', $array);
        $this->assertArrayNotHasKey('stag_sync_error', $array);

        // Assert fillable fields and the connection flag are in array representation
        $this->assertArrayHasKey('stag_sync_status', $array);
        $this->assertArrayHasKey('stag_synced_at', $array);
        $this->assertEquals('success', $array['stag_sync_status']);
        $this->assertTrue($array['stag_connected']);
    }

    public function test_stag_connected_follows_ticket(): void
    {
        $user = User::factory()->create([
            'stag_ticket'            => null,
            'stag_ticket_expires_at' => null,
        ]);
        $this->assertFalse($user->stag_connected);

        $user->update(['stag_ticket' => 'ticket', 'stag_ticket_expires_at' => null]);
        $this->assertTrue($user->fresh()->stag_connected);

        $user->update(['stag_ticket_expires_at' => now()->addHour()]);
        $this->assertTrue($user->fresh()->stag_connected);

        $user->update(['stag_ticket_expires_at' => now()->subMinute()]);
        $this->assertFalse($user->fresh()->stag_connected);

        $user->update(['stag_ticket' => '', 'stag_ticket_expires_at' => now()->addHour()]);
        $this->assertFalse($user->fresh()->stag_connected);
    }
}
