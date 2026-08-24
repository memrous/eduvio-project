<?php

namespace App\Http\Controllers;

use App\Models\University;
use App\Models\Faculty;
use App\Models\StudyProgram;
use Illuminate\Http\JsonResponse;

class AcademicController extends Controller
{
    /**
     * Get a list of all universities.
     *
     * @return JsonResponse
     */
    public function getUniversities(): JsonResponse
    {
        $universities = University::all();
        return response()->json($universities);
    }

    /**
     * Get faculties belonging to the given university ID.
     *
     * @param  int  $universityId
     * @return JsonResponse
     */
    public function getFaculties(int $universityId): JsonResponse
    {
        $faculties = Faculty::where('university_id', $universityId)->get();
        return response()->json($faculties);
    }

    /**
     * Get study programs belonging to the given faculty ID.
     *
     * @param  int  $facultyId
     * @return JsonResponse
     */
    public function getPrograms(int $facultyId): JsonResponse
    {
        $programs = StudyProgram::where('faculty_id', $facultyId)->get();
        return response()->json($programs);
    }
}
