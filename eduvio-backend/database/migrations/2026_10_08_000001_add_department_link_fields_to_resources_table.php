<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->string('link_source')->nullable(); // values: auto, manual
            $table->string('source_person')->nullable();
            $table->timestamp('last_checked_at')->nullable();
        });

        // One platform link per URL and subject; file materials are not affected
        DB::statement(
            "CREATE UNIQUE INDEX resources_platform_link_unique ON resources (user_id, subject_id, url) WHERE category = 'platform'"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS resources_platform_link_unique');

        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn(['link_source', 'source_person', 'last_checked_at']);
        });
    }
};
