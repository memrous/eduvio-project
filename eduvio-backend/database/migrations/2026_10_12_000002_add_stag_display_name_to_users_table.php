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
        // Jméno studenta s tituly ze STAGu (student/getStudentInfo) pro kartu IS/STAG v profilu
        Schema::table('users', function (Blueprint $table) {
            $table->string('stag_display_name')->nullable()->after('stag_user_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('stag_display_name');
        });
    }
};
