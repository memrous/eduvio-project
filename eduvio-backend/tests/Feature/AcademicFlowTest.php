<?php

namespace Tests\Feature;

use App\Models\University;
use App\Models\Faculty;
use App\Models\StudyProgram;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_universities(): void
    {
        University::create([
            'name' => 'Palacký University Olomouc',
            'code' => 'UPOL',
        ]);

        $response = $this->getJson('/api/academic/universities');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'name' => 'Palacký University Olomouc',
                'code' => 'UPOL',
            ]);
    }

    public function test_can_get_faculties_by_university(): void
    {
        $univ = University::create([
            'name' => 'Palacký University Olomouc',
            'code' => 'UPOL',
        ]);

        $faculty = Faculty::create([
            'university_id' => $univ->id,
            'name' => 'Faculty of Science',
            'code' => 'PRF',
        ]);

        $response = $this->getJson("/api/academic/universities/{$univ->id}/faculties");

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'university_id' => $univ->id,
                'name' => 'Faculty of Science',
                'code' => 'PRF',
            ]);
    }

    public function test_can_get_programs_by_faculty(): void
    {
        $univ = University::create([
            'name' => 'Palacký University Olomouc',
            'code' => 'UPOL',
        ]);

        $faculty = Faculty::create([
            'university_id' => $univ->id,
            'name' => 'Faculty of Science',
            'code' => 'PRF',
        ]);

        $program = StudyProgram::create([
            'faculty_id' => $faculty->id,
            'name' => 'Applied Informatics',
            'code' => 'B1801',
        ]);

        $response = $this->getJson("/api/academic/faculties/{$faculty->id}/programs");

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'faculty_id' => $faculty->id,
                'name' => 'Applied Informatics',
                'code' => 'B1801',
            ]);
    }

    public function test_user_can_have_academic_details(): void
    {
        $univ = University::create([
            'name' => 'Palacký University Olomouc',
            'code' => 'UPOL',
        ]);

        $faculty = Faculty::create([
            'university_id' => $univ->id,
            'name' => 'Faculty of Science',
            'code' => 'PRF',
        ]);

        $program = StudyProgram::create([
            'faculty_id' => $faculty->id,
            'name' => 'Applied Informatics',
            'code' => 'B1801',
        ]);

        $user = User::factory()->create([
            'university_id' => $univ->id,
            'faculty_id' => $faculty->id,
            'study_program_id' => $program->id,
            'academic_year' => 2,
        ]);

        $this->assertEquals($univ->id, $user->university->id);
        $this->assertEquals($faculty->id, $user->faculty->id);
        $this->assertEquals($program->id, $user->studyProgram->id);
        $this->assertEquals(2, $user->academic_year);
    }
}
