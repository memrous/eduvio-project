<?php

use App\Http\Controllers\AppConfigController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\StagAgentController;
use App\Http\Controllers\StagController;
use App\Http\Controllers\StagConnectController;
use App\Http\Controllers\StagAuthController;
use App\Http\Controllers\StagStudentController;
use App\Http\Controllers\StudyProgressController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentLinksController;
use App\Http\Controllers\ExamTermController;
use App\Http\Controllers\ExamTopicController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\SyllabusController;
use App\Http\Controllers\MoodleConnectController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Veřejné endpointy
Route::get('/config', [AppConfigController::class, 'show']);
// Ruční kontrola po nasazení (DB, disk materiálů, fronta); bez detailů chyb
Route::get('/health', [HealthController::class, 'show'])->middleware('throttle:6,1');
// 5 pokusů za minutu na IP + e-mail (limiter "auth" v AppServiceProvider)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});
Route::post('/check-availability', [AuthController::class, 'checkAvailability'])->middleware('throttle:30,1');

// Endpointy STAG agenta: projde token s ability "stag:sync" (stag-agent) i plný token "*"
// (StagSyncJob v režimu server). Jediné routy, kam smí omezený token agenta.
Route::middleware(['auth:sanctum', 'ability:stag:sync', 'throttle:30,1'])->group(function () {
    Route::post('/stag/sync-schedule', [StagController::class, 'syncSchedule']);
    Route::post('/stag/sync-subjects', [StagController::class, 'syncSubjects']);
    Route::post('/stag/sync-student',  [StagStudentController::class, 'sync']);
    Route::post('/stag/sync-exam-terms', [ExamTermController::class, 'sync']);
    Route::post('/stag/agent/report',  [StagAgentController::class, 'report']);
    Route::get('/stag/agent/whoami',   [StagAgentController::class, 'whoami']);
    // Polled by `stag_agent.py watch`: presence + "sync now" requests from the app
    Route::get('/stag/agent/pending',  [StagAgentController::class, 'pending']);
});

// Chráněné endpointy (vyžadují v hlavičce: Authorization: Bearer <token> s plným přístupem)
Route::middleware(['auth:sanctum', 'full-access'])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/user/study-progress', [StudyProgressController::class, 'show']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Subjects
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::get('/subjects/{subject}', [SubjectController::class, 'show']);
    Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);
    Route::get('/subjects/{subjectId}/note', [NoteController::class, 'show']);
    Route::put('/subjects/{subjectId}/note', [NoteController::class, 'update']);

    // Exam: terms from STAG (read-only) and the student's own topic checklist
    Route::get('/subjects/{subjectId}/exam-terms', [ExamTermController::class, 'index']);
    Route::get('/subjects/{subjectId}/exam-topics', [ExamTopicController::class, 'index']);
    Route::post('/subjects/{subjectId}/exam-topics', [ExamTopicController::class, 'store']);
    Route::patch('/exam-topics/{topicId}', [ExamTopicController::class, 'update']);
    Route::delete('/exam-topics/{topicId}', [ExamTopicController::class, 'destroy']);

    // Semester schedule from teachers' course pages
    Route::get('/subjects/{subjectId}/syllabus', [SyllabusController::class, 'index']);
    Route::get('/syllabus/assessments', [SyllabusController::class, 'assessments']);
    Route::post('/syllabus-items/{id}/hide', [SyllabusController::class, 'hide']);
    Route::post('/syllabus-items/{id}/unhide', [SyllabusController::class, 'unhide']);

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
    // Uploaded file (private disk): owner only, inline or ?download=1
    Route::get('/materials/{material}/file', [MaterialController::class, 'file']);
    Route::put('/materials/{material}', [MaterialController::class, 'update']);
    Route::patch('/materials/{material}', [MaterialController::class, 'patch']);
    Route::post('/materials/{material}/hide', [MaterialController::class, 'hide']);
    Route::post('/materials/{material}/unhide', [MaterialController::class, 'unhide']);
    Route::post('/materials/{material}/seen', [MaterialController::class, 'seen']);
    Route::post('/materials/{material}/for-exam', [MaterialController::class, 'markForExam']);
    Route::delete('/materials/{material}/for-exam', [MaterialController::class, 'unmarkForExam']);
    Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);

    // Dashboard
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // STAG Synchronizace
    Route::delete('/user/stag',        [StagConnectController::class, 'disconnect']);
    Route::get('/user/stag/status',    [StagConnectController::class, 'status']);
    Route::post('/user/stag/resync',   [StagConnectController::class, 'resync']);
    Route::post('/user/stag/request-sync', [StagConnectController::class, 'requestSync']);
    Route::get('/user/stag/redirect',  [StagAuthController::class, 'redirect']);
    Route::post('/user/stag/agent-token',   [StagAgentController::class, 'createToken']);
    Route::delete('/user/stag/agent-token', [StagAgentController::class, 'revokeToken']);

    // Moodle Synchronizace
    Route::post('/user/moodle/launch',   [MoodleConnectController::class, 'startLaunch']);
    Route::post('/user/moodle/token',    [MoodleConnectController::class, 'connectToken']);
    Route::delete('/user/moodle',        [MoodleConnectController::class, 'disconnect']);
    Route::get('/user/moodle/status',    [MoodleConnectController::class, 'status']);
    Route::post('/user/moodle/resync',   [MoodleConnectController::class, 'resync']);

    // Odkazy na stránky předmětů z webů kateder
    Route::get('/user/department-links/status',   [DepartmentLinksController::class, 'status']);
    Route::post('/user/department-links/refresh', [DepartmentLinksController::class, 'refresh']);
});