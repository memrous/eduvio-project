<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Studijní údaje dodává výhradně STAG (users.study_program, faculty, study_year, ...),
 * ruční výběr z vlastních číselníků při registraci se ruší.
 */
return new class extends Migration
{
    private const USER_FOREIGN_KEYS = ['university_id', 'faculty_id', 'study_program_id'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (self::USER_FOREIGN_KEYS as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropForeign([$column]);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $columns = array_values(array_filter(
                [...self::USER_FOREIGN_KEYS, 'academic_year'],
                fn (string $column) => Schema::hasColumn('users', $column)
            ));
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        Schema::dropIfExists('study_programs');
        Schema::dropIfExists('faculties');
        Schema::dropIfExists('universities');
    }

    /**
     * Reverse the migrations (same structure as the original 2026_06_25 migrations, without data).
     */
    public function down(): void
    {
        Schema::create('universities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->timestamps();
        });

        Schema::create('faculties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->timestamps();
        });

        Schema::create('study_programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faculty_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('university_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('faculty_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('study_program_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('academic_year')->nullable();
        });
    }
};
