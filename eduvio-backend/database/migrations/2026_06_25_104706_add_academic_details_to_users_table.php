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
            if (!Schema::hasColumn('users', 'university_id')) {
                $table->foreignId('university_id')->nullable()->constrained()->onDelete('set null');
                $table->foreignId('faculty_id')->nullable()->constrained()->onDelete('set null');
                $table->foreignId('study_program_id')->nullable()->constrained()->onDelete('set null');
                $table->integer('academic_year')->nullable();
                $table->string('stag_student_id')->nullable();
                $table->string('stag_username')->nullable();
                $table->string('stag_password')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'university_id')) {
                $table->dropForeign(['university_id']);
            }
            if (Schema::hasColumn('users', 'faculty_id')) {
                $table->dropForeign(['faculty_id']);
            }
            if (Schema::hasColumn('users', 'study_program_id')) {
                $table->dropForeign(['study_program_id']);
            }
            $table->dropColumn([
                'university_id',
                'faculty_id',
                'study_program_id',
                'academic_year',
                'stag_student_id',
                'stag_username',
                'stag_password'
            ]);
        });
    }
};
