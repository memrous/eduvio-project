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
        Schema::create('requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // homework, test, exam, project, milestone
            $table->string('title');
            $table->text('context')->nullable();
            $table->date('due_date')->nullable();
            $table->string('due_time')->nullable();
            $table->integer('weight')->nullable();
            $table->integer('max_points')->nullable();
            $table->integer('gained_points')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requirements');
    }
};
