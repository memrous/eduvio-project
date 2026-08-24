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
        Schema::table('resources', function (Blueprint $table) {
            // Drop existing foreign key on subject_id
            $table->dropForeign(['subject_id']);
        });

        Schema::table('resources', function (Blueprint $table) {
            // Make subject_id nullable and add it back
            $table->unsignedBigInteger('subject_id')->nullable()->change();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();

            // Add new columns
            $table->foreignId('event_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('requirement_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category')->default('file'); // values: file, platform
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropForeign(['requirement_id']);
            $table->dropForeign(['subject_id']);
            
            $table->dropColumn(['event_id', 'requirement_id', 'category']);
        });

        Schema::table('resources', function (Blueprint $table) {
            // Revert subject_id to non-nullable
            $table->unsignedBigInteger('subject_id')->nullable(false)->change();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
        });
    }
};
