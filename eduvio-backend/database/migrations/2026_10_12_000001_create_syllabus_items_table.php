<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Semester schedule from teachers' course pages (DepartmentLinksSyncJob)
        Schema::create('syllabus_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            // The semester link (resources, category "platform") the item was found on
            $table->foreignId('resource_id')->constrained('resources')->cascadeOnDelete();
            $table->date('date');
            $table->string('title', 500);
            $table->text('description')->nullable();
            // [{text, url}] with absolute URLs
            $table->json('links')->nullable();
            // session | assessment | holiday
            $table->string('kind', 16);
            // test | credit_test | retake | exam | deadline | project
            $table->string('assessment_type', 16)->nullable();
            $table->timestamp('hidden_at')->nullable();
            // sha1 of the date and the normalized title
            $table->string('source_hash', 40);
            $table->timestamps();

            $table->unique(['user_id', 'subject_id', 'source_hash']);
            $table->index(['subject_id', 'date']);
            $table->index(['user_id', 'kind', 'date']);
        });

        Schema::table('resources', function (Blueprint $table) {
            // Link to exam topics found on a teacher's page
            $table->boolean('is_exam_topics')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn('is_exam_topics');
        });
        Schema::dropIfExists('syllabus_items');
    }
};
