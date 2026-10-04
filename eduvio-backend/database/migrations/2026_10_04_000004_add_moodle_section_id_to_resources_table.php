<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->unsignedBigInteger('moodle_section_id')->nullable();
            $table->unique(['user_id', 'moodle_section_id']);
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'moodle_section_id']);
            $table->dropColumn('moodle_section_id');
        });
    }
};
