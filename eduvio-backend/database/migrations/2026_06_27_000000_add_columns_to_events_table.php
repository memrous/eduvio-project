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
        Schema::table('events', function (Blueprint $table) {
            $table->string('room')->nullable();
            $table->string('teacher_name')->nullable();
            $table->string('teacher_email')->nullable();
            $table->unsignedBigInteger('requirement_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['room', 'teacher_name', 'teacher_email', 'requirement_id']);
        });
    }
};
