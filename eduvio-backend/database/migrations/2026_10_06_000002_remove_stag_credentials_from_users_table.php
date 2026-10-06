<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * STAG is connected via the ticket login flow only; stored credentials are no longer used.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['stag_username', 'stag_password']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stag_username')->nullable()->after('stag_student_id');
            $table->string('stag_password')->nullable()->after('stag_username');
        });
    }
};
