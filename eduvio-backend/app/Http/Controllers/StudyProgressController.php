<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class StudyProgressController extends Controller
{
    // ECTS známky na českou stupnici (F = 4, aby odpovídala zahrnuté čtyřce)
    private const LETTER_GRADES = ['A' => 1.0, 'B' => 1.5, 'C' => 2.0, 'D' => 2.5, 'E' => 3.0, 'F' => 4.0];

    // Orientační počet kreditů podle typu studijního programu (STAG typSp)
    private const REQUIRED_CREDITS = ['B' => 180, 'N' => 120, 'M' => 300];

    /**
     * GET /api/user/study-progress
     * Postup studiem spočítaný z předmětů uživatele (STAG i ruční).
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $subjects = Subject::where('user_id', $user->id)
            ->get(['credits', 'status', 'final_grade', 'semester', 'stag_removed_at']);

        $completed = $subjects->where('status', 'completed');

        $weightedSum = 0.0;
        $weightTotal = 0;
        foreach ($subjects as $subject) {
            $grade = $this->numericGrade($subject->final_grade);
            $credits = (int) $subject->credits;
            if ($grade === null || $credits <= 0) {
                continue;
            }
            $weightedSum += $grade * $credits;
            $weightTotal += $credits;
        }

        $currentSemester = $this->currentSemester(now());
        $currentSemesterCredits = $subjects
            ->filter(fn (Subject $s) => $s->stag_removed_at === null && $this->semesterKey($s->semester) === $currentSemester)
            ->sum(fn (Subject $s) => (int) $s->credits);

        return response()->json([
            'earned_credits'             => (int) $completed->sum(fn (Subject $s) => (int) $s->credits),
            'completed_subjects'         => $completed->count(),
            'weighted_average'           => $weightTotal > 0 ? round($weightedSum / $weightTotal, 2) : null,
            'required_credits'           => $this->requiredCredits($user),
            'required_credits_estimated' => true,
            'current_semester'           => $currentSemester,
            'current_semester_credits'   => (int) $currentSemesterCredits,
        ]);
    }

    /** Číselná známka 1–4 (včetně 1,5 / 2,5 a ECTS A–F), jinak null (zápočty, neznámky). */
    private function numericGrade(?string $value): ?float
    {
        $normalized = strtoupper(trim((string) $value));
        if ($normalized === '') {
            return null;
        }
        if (isset(self::LETTER_GRADES[$normalized])) {
            return self::LETTER_GRADES[$normalized];
        }
        $normalized = str_replace(',', '.', $normalized);
        if (!is_numeric($normalized)) {
            return null;
        }
        $grade = (float) $normalized;

        return $grade >= 1 && $grade <= 4 ? $grade : null;
    }

    private function requiredCredits(User $user): ?int
    {
        $code = strtoupper(trim((string) $user->study_type));
        if (isset(self::REQUIRED_CREDITS[$code])) {
            return self::REQUIRED_CREDITS[$code];
        }

        // Celý název typu studia, pokud by STAG vrátil text místo zkratky
        $name = Str::lower(Str::ascii((string) $user->study_type));

        return match (true) {
            str_contains($name, 'navazuj') => 120,
            str_contains($name, 'bakal') => 180,
            str_contains($name, 'magist') => 300,
            default => null,
        };
    }

    /**
     * Aktuální semestr ve tvaru jako ze STAGu ("ZS 2026"): září–leden je ZS,
     * únor–srpen LS; rok je začátek akademického roku.
     */
    private function currentSemester(Carbon $now): string
    {
        $month = $now->month;
        $startYear = $month >= 9 ? $now->year : $now->year - 1;

        return ($month >= 9 || $month === 1 ? 'ZS' : 'LS') . ' ' . $startYear;
    }

    /** "ZS 2026", "zs 2026/2027" -> "ZS 2026"; jiný tvar -> null. */
    private function semesterKey(?string $semester): ?string
    {
        if (!preg_match('/^\s*(ZS|LS)\s+(\d{4})/i', (string) $semester, $m)) {
            return null;
        }

        return strtoupper($m[1]) . ' ' . $m[2];
    }
}
