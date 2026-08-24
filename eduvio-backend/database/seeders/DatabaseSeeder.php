<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => bcrypt('password')]
);

        $this->call(AcademicDetailsSeeder::class);

        // RequirementSeeder depends on subjects already existing.
        // Run test_import.py (STAG sync) first, then: php artisan db:seed --class=RequirementSeeder
        $this->call(RequirementSeeder::class);
    }
}
