<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Requirement;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        $userId = $request->user()->id;

        $daysThreshold = 3;
        $lowScoreThreshold = 50;

        $today = Carbon::today('Europe/Prague');
        $now = Carbon::now('Europe/Prague')->format('H:i:s');

        // 1. nextClass: earliest upcoming or ongoing event for the user's subjects
        $nextClass = Event::whereHas('subject', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where(function ($q) use ($today, $now) {
                $q->where('date', '>', $today->toDateString())
                  ->orWhere(function ($q2) use ($today, $now) {
                      $q2->where('date', $today->toDateString())
                         ->where(function ($q3) use ($now) {
                             $q3->where('end_time', '>=', $now)
                                ->orWhere(function ($q4) use ($now) {
                                    $q4->whereNull('end_time')
                                       ->where('time', '>=', $now);
                                });
                         });
                  });
            })
            ->orderBy('date')
            ->orderBy('time')
            ->first();

        // 2. todaySchedule: all events for the user's subjects today
        $todaySchedule = Event::whereHas('subject', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where('date', $today->toDateString())
            ->orderBy('time')
            ->get();

        // 3. needsAttention: upcoming deadlines + low-scoring subjects
        $needsAttention = [];

        // 3a. Upcoming deadlines (not completed, due within DAYS_THRESHOLD days)
        $thresholdDate = $today->copy()->addDays($daysThreshold);

        $upcomingDeadlines = Requirement::whereHas('subject', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where('completed', false)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$today->toDateString(), $thresholdDate->toDateString()])
            ->with('subject')
            ->get();

        foreach ($upcomingDeadlines as $req) {
            $needsAttention[] = [
                'type'          => 'deadline',
                'requirementId' => $req->id,
                'subjectId'     => $req->subject_id,
                'subjectCode'   => $req->subject->code,
                'title'         => $req->title,
                'dueDate'       => $req->due_date,
            ];
        }

        // 3b. Low-scoring subjects
        $subjects = Subject::where('user_id', $userId)
            ->with('requirements')
            ->get();

        foreach ($subjects as $subject) {
            $completedWithPoints = $subject->requirements->filter(function ($r) {
                return $r->completed && $r->gained_points !== null && $r->max_points !== null && $r->max_points > 0;
            });
            if ($completedWithPoints->isNotEmpty()) {
                $avgScore = $completedWithPoints->avg(function ($r) {
                    return ($r->gained_points / $r->max_points) * 100;
                });
                if ($avgScore < $lowScoreThreshold) {
                    $needsAttention[] = [
                        'type'        => 'low_score',
                        'subjectId'   => $subject->id,
                        'subjectCode' => $subject->code,
                        'subjectName' => $subject->name,
                        'score'       => round($avgScore),
                    ];
                }
            }
        }

        // 4. subjects with computed score
        $subjectsWithScore = $subjects->map(function ($subject) {
            $completedWithPoints = $subject->requirements->filter(function ($r) {
                return $r->completed && $r->gained_points !== null && $r->max_points !== null && $r->max_points > 0;
            });
            $score = null;
            if ($completedWithPoints->isNotEmpty()) {
                $score = round($completedWithPoints->avg(function ($r) {
                    return ($r->gained_points / $r->max_points) * 100;
                }));
            }
            $gainedPoints = (int) $subject->requirements->sum('gained_points');
            $maxPoints = (int) $subject->requirements->sum('max_points');

            $subjectArray = $subject->toArray();
            $subjectArray['score'] = $score;
            $subjectArray['gained_points'] = $gainedPoints;
            $subjectArray['gainedPoints'] = $gainedPoints;
            $subjectArray['max_points'] = $maxPoints;
            $subjectArray['maxPoints'] = $maxPoints;
            return $subjectArray;
        });

        // 5. progress
        $subjectsAll = Subject::where('user_id', $userId)
            ->with(['requirements' => function ($q) {
                $q->where('completed', true)->where('type', 'exam');
            }])
            ->get();

        $completedSubjects = $subjectsAll->filter(function ($s) {
            return $s->requirements->isNotEmpty();
        });

        $creditsGained = $completedSubjects->sum('credits');
        $creditsTotal = $subjectsAll->sum('credits');
        $completedSubjectsCount = $completedSubjects->count();
        $totalSubjectsCount = $subjectsAll->count();

        $scoresForAverage = $subjectsWithScore->pluck('score')->filter(fn($s) => $s !== null);
        $averageScore = $scoresForAverage->isNotEmpty()
            ? round($scoresForAverage->avg())
            : null;

        return response()->json([
            'nextClass'      => $nextClass,
            'todaySchedule'  => $todaySchedule,
            'needsAttention' => $needsAttention,
            'subjects'       => $subjectsWithScore->values(),
            'progress'       => [
                'creditsGained'      => $creditsGained,
                'creditsTotal'       => $creditsTotal,
                'completedSubjects'  => $completedSubjectsCount,
                'totalSubjects'      => $totalSubjectsCount,
                'averageScore'       => $averageScore,
            ],
        ]);
    }
}
