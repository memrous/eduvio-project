<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->unsignedBigInteger('moodle_cmid')->nullable();
            $table->unsignedBigInteger('moodle_course_id')->nullable();
            $table->unique(['user_id', 'moodle_cmid']);
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'moodle_cmid']);
            $table->dropColumn(['moodle_cmid', 'moodle_course_id']);
        });
    }
};
