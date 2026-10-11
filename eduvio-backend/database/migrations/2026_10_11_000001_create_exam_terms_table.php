<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Exam and credit terms from IS/STAG (terminy/getTerminyProStudenta), replaced on every sync
        Schema::create('exam_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->string('stag_id');
            $table->date('date');
            $table->string('start_time', 5)->nullable();
            $table->string('end_time', 5)->nullable();
            // exam | credit | other
            $table->string('kind', 16)->default('other');
            $table->string('room')->nullable();
            $table->string('examiner')->nullable();
            $table->boolean('is_registered')->default(false);
            $table->unsignedInteger('capacity')->nullable();
            $table->unsignedInteger('occupied')->nullable();
            $table->date('deregistration_deadline')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'stag_id']);
            $table->index(['subject_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_terms');
    }
};
