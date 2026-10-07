<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = [
        'lecturers', 'tutors',
        'stag_annotation', 'stag_requirements', 'stag_syllabus', 'stag_literature', 'stag_assessment',
        'exam_form', 'credit_before_exam', 'stag_url', 'stag_completion_state',
        'credit_result', 'credit_date', 'credit_attempt', 'credit_examiner',
        'exam_result', 'exam_date', 'exam_attempt', 'exam_points', 'exam_examiner',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Osoby (garant jde do existujícího sloupce guarantor)
            $table->text('lecturers')->nullable();
            $table->text('tutors')->nullable();

            // Sylabus z getPredmetInfo
            $table->text('stag_annotation')->nullable();
            $table->text('stag_requirements')->nullable();
            $table->text('stag_syllabus')->nullable();
            $table->text('stag_literature')->nullable();
            $table->text('stag_assessment')->nullable();
            $table->string('exam_form')->nullable();
            $table->boolean('credit_before_exam')->nullable();
            $table->string('stag_url')->nullable();
            $table->string('stag_completion_state')->nullable();

            // Výsledky z getZnamkyByStudent
            $table->string('credit_result')->nullable();
            $table->date('credit_date')->nullable();
            $table->smallInteger('credit_attempt')->nullable();
            $table->string('credit_examiner')->nullable();
            $table->string('exam_result')->nullable();
            $table->date('exam_date')->nullable();
            $table->smallInteger('exam_attempt')->nullable();
            $table->decimal('exam_points', 6, 2)->nullable();
            $table->string('exam_examiner')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(self::COLUMNS);
        });
    }
};
