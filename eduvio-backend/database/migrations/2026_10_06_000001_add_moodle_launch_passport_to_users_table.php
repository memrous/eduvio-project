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
            $table->string('moodle_launch_passport')->nullable()->after('moodle_user_id');
            $table->timestamp('moodle_launch_expires_at')->nullable()->after('moodle_launch_passport');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['moodle_launch_passport', 'moodle_launch_expires_at']);
        });
    }
};
