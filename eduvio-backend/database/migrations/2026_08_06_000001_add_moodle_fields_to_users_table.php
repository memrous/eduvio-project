<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('moodle_url')->nullable()->after('stag_last_sync_attempt_at');
            $table->string('moodle_username')->nullable()->after('moodle_url');
            $table->string('moodle_password')->nullable()->after('moodle_username');
            $table->string('moodle_sync_status')->nullable()->after('moodle_password');
            $table->text('moodle_sync_error')->nullable()->after('moodle_sync_status');
            $table->timestamp('moodle_synced_at')->nullable()->after('moodle_sync_error');
            $table->timestamp('moodle_last_sync_attempt_at')->nullable()->after('moodle_synced_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'moodle_url',
                'moodle_username',
                'moodle_password',
                'moodle_sync_status',
                'moodle_sync_error',
                'moodle_synced_at',
                'moodle_last_sync_attempt_at',
            ]);
        });
    }
};
