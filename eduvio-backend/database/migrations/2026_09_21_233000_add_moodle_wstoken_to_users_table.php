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
            $table->text('moodle_wstoken')->nullable()->after('moodle_last_sync_attempt_at');
            $table->string('moodle_display_name')->nullable()->after('moodle_wstoken');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['moodle_wstoken', 'moodle_display_name']);
        });
    }
};
