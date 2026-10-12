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
        // STAG agent (STAG_MODE=agent): sync requested from the app, last time the agent asked for work
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('stag_sync_requested_at')->nullable()->after('stag_last_sync_attempt_at');
            $table->timestamp('stag_agent_last_seen_at')->nullable()->after('stag_sync_requested_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['stag_sync_requested_at', 'stag_agent_last_seen_at']);
        });
    }
};
