<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Typy rozvrhových akcí, které posílá STAG (typAkce). Frontend používá
     * pro ruční akce anglické typy, takže se s nimi nepletou.
     */
    private const STAG_EVENT_TYPES = [
        'Přednáška', 'Cvičení', 'Seminář', 'Laboratoř', 'Ateliér',
        'Exkurze', 'Konzultace', 'Praxe', 'Blok',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->string('source')->default('manual');
            $table->timestamp('stag_removed_at')->nullable();
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('source')->default('manual');
        });

        // Backfill: předměty ze STAGu dostávají při založení tento popis
        DB::table('subjects')
            ->where('description', 'Imported from IS/STAG')
            ->update(['source' => 'stag']);

        DB::table('events')
            ->whereIn('subject_id', DB::table('subjects')->select('id')->where('source', 'stag'))
            ->whereIn('type', self::STAG_EVENT_TYPES)
            ->update(['source' => 'stag']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('source');
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(['source', 'stag_removed_at']);
        });
    }
};
