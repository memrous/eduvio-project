<?php

namespace Database\Seeders;

use App\Models\University;
use App\Models\Faculty;
use App\Models\StudyProgram;
use Illuminate\Database\Seeder;

class AcademicDetailsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $university = University::updateOrCreate(
            ['code' => 'UPOL'],
            ['name' => 'Palacký University Olomouc']
        );

        $faculty = Faculty::updateOrCreate(
            [
                'university_id' => $university->id,
                'code' => 'PRF'
            ],
            ['name' => 'Faculty of Science']
        );

        StudyProgram::updateOrCreate(
            [
                'faculty_id' => $faculty->id,
                'code' => 'B1801'
            ],
            ['name' => 'Applied Informatics']
        );
    }
}
