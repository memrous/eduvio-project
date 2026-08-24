<?php

use App\Http\Controllers\AcademicController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\StagController;
use App\Http\Controllers\StagConnectController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MoodleController;
use App\Http\Controllers\MoodleConnectController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Veřejné endpointy
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/check-availability', [AuthController::class, 'checkAvailability']);

// Academic Dropdowns
Route::get('/academic/universities', [AcademicController::class, 'getUniversities']);
Route::get('/academic/universities/{universityId}/faculties', [AcademicController::class, 'getFaculties']);
Route::get('/academic/faculties/{facultyId}/programs', [AcademicController::class, 'getPrograms']);

// Chráněné endpointy (vyžadují v hlavičce: Authorization: Bearer <token>)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Subjects
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::get('/subjects/{subject}', [SubjectController::class, 'show']);
    Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);
    Route::get('/subjects/{subjectId}/note', [NoteController::class, 'show']);
    Route::put('/subjects/{subjectId}/note', [NoteController::class, 'update']);

    // Events
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::patch('/events/{event}/status', [EventController::class, 'updateStatus']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);

    // Requirements
    Route::get('/requirements', [RequirementController::class, 'index']);
    Route::post('/requirements', [RequirementController::class, 'store']);
    Route::put('/requirements/{requirement}', [RequirementController::class, 'update']);
    Route::delete('/requirements/{requirement}', [RequirementController::class, 'destroy']);

    // Materials (Resources)
    Route::get('/materials', [MaterialController::class, 'index']);
    Route::post('/materials', [MaterialController::class, 'store']);
    Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);

    // Dashboard
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // STAG Synchronizace
    Route::post('/stag/sync-schedule', [StagController::class, 'syncSchedule']);
    Route::post('/user/stag',          [StagConnectController::class, 'connect']);
    Route::delete('/user/stag',        [StagConnectController::class, 'disconnect']);
    Route::get('/user/stag/status',    [StagConnectController::class, 'status']);
    Route::post('/user/stag/resync',   [StagConnectController::class, 'resync']);

    // Moodle Synchronizace
    Route::post('/moodle/sync-requirements', [MoodleController::class, 'syncRequirements']);
    Route::post('/user/moodle',          [MoodleConnectController::class, 'connect']);
    Route::delete('/user/moodle',        [MoodleConnectController::class, 'disconnect']);
    Route::get('/user/moodle/status',    [MoodleConnectController::class, 'status']);
    Route::post('/user/moodle/resync',   [MoodleConnectController::class, 'resync']);
});