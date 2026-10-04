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
        Schema::table('requirements', function (Blueprint $table) {
            $table->unsignedBigInteger('moodle_assignment_id')->nullable()->after('subject_id');
            $table->unique(['subject_id', 'moodle_assignment_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            $table->dropUnique(['subject_id', 'moodle_assignment_id']);
            $table->dropColumn('moodle_assignment_id');
        });
    }
};
