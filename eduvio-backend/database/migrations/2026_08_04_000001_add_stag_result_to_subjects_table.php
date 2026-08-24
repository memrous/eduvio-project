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
        Schema::table('subjects', function (Blueprint $table) {
            $table->string('status')->default('in_progress'); // in_progress, completed, closed, failed
            $table->string('final_grade')->nullable(); // 1, 2, 3, 4, A, B, C, D, E, F, Z, Záp.
        });

        Schema::table('requirements', function (Blueprint $table) {
            $table->string('grade')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(['status', 'final_grade']);
        });

        Schema::table('requirements', function (Blueprint $table) {
            $table->dropColumn(['grade']);
        });
    }
};
