<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stag_sync_status')->nullable()->after('stag_password');
            $table->text('stag_sync_error')->nullable()->after('stag_sync_status');
            $table->timestamp('stag_synced_at')->nullable()->after('stag_sync_error');
        });

        DB::table('users')->whereNotNull('stag_password')->orderBy('id')->each(function ($user) {
            DB::table('users')->where('id', $user->id)->update([
                'stag_password' => Crypt::encryptString($user->stag_password)
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->whereNotNull('stag_password')->orderBy('id')->each(function ($user) {
            try {
                DB::table('users')->where('id', $user->id)->update([
                    'stag_password' => Crypt::decryptString($user->stag_password)
                ]);
            } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
                // If it is not encrypted or decryption fails, do nothing
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'stag_sync_status',
                'stag_sync_error',
                'stag_synced_at',
            ]);
        });
    }
};
