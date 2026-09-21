<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->string('statut', 10)->nullable()->after('is_mandatory');
        });

        // Best-effort backfill pro existující data
        DB::table('subjects')->where('is_mandatory', true)->whereNull('statut')->update(['statut' => 'A']);
        DB::table('subjects')->where('is_mandatory', false)->whereNull('statut')->update(['statut' => 'C']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn('statut');
        });
    }
};
