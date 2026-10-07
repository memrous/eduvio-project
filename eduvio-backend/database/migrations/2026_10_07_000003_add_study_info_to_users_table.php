<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = [
        'study_program', 'study_program_code', 'faculty', 'study_form', 'study_type', 'study_type_key',
        'study_year', 'study_status', 'study_officer_name', 'study_officer_email', 'study_officer_phone',
        'study_info_synced_at',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Studijní údaje ze STAGu (student/getStudentInfo, jen whitelist polí)
        Schema::table('users', function (Blueprint $table) {
            $table->string('study_program')->nullable();
            $table->string('study_program_code')->nullable();
            $table->string('faculty')->nullable();
            $table->string('study_form')->nullable();
            $table->string('study_type')->nullable();
            $table->string('study_type_key')->nullable();
            $table->smallInteger('study_year')->nullable();
            $table->string('study_status')->nullable();
            $table->string('study_officer_name')->nullable();
            $table->string('study_officer_email')->nullable();
            $table->string('study_officer_phone')->nullable();
            $table->timestamp('study_info_synced_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(self::COLUMNS);
        });
    }
};
