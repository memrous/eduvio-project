<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->json('page_links')->nullable();      // links on the linked page at the last check
            $table->json('page_links_new')->nullable();  // links that appeared and were not seen yet
            $table->timestamp('content_changed_at')->nullable();
            $table->timestamp('seen_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn(['page_links', 'page_links_new', 'content_changed_at', 'seen_at']);
        });
    }
};
