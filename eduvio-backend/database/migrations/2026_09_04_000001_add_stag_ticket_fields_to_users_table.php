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
        Schema::table('users', function (Blueprint $table) {
            $table->text('stag_ticket')->nullable()->after('stag_password');
            $table->timestamp('stag_ticket_expires_at')->nullable()->after('stag_ticket');
            $table->string('stag_user_name')->nullable()->after('stag_ticket_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'stag_ticket',
                'stag_ticket_expires_at',
                'stag_user_name',
            ]);
        });
    }
};
