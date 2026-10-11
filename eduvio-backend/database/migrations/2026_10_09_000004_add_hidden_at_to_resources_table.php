<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            // Hidden by the user (Moodle and automatic materials come back on sync, so they are hidden, not deleted)
            $table->timestamp('hidden_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn('hidden_at');
        });
    }
};
