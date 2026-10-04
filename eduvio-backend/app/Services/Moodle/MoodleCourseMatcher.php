<?php

namespace App\Services\Moodle;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class MoodleCourseMatcher
{
    /**
     * Course shortname, e.g. "2026-ZS-KAG/MR-Prezenční-ZS-":
     * 1 = year-semester prefix, 2 = department, 3 = subject code.
     */
    private const SHORTNAME_PATTERN = '#^(\d{4}-[A-Z]{2})-([A-Za-z0-9]+)/([A-Za-z0-9]+)(?:-|$)#u';

    /**
     * Pair Moodle courses with the user's subjects. When several courses point
     * to the same subject, only the one with the newest year-semester prefix wins;
     * the others are marked as skipped.
     *
     * @param  array  $courses  Result of core_enrol_get_users_courses.
     * @return array<int, MoodleCourseMatch> Keyed by course id, in input order.
     */
    public function match(User $user, array $courses): array
    {
        /** @var Collection<string, Collection<int, Subject>> $subjectsByCode */
        $subjectsByCode = Subject::where('user_id', $user->id)->orderBy('id')->get()->groupBy('code');

        // course id => ['subject' => Subject, 'rank' => int]
        $candidates = [];
        // subject id => ['courseId', 'rank']
        $bestPerSubject = [];
        $fullnames = [];

        foreach ($courses as $course) {
            $courseId = (int) ($course['id'] ?? 0);
            $shortname = (string) ($course['shortname'] ?? '');
            $fullnames[$courseId] = (string) ($course['fullname'] ?? $shortname);

            if (! preg_match(self::SHORTNAME_PATTERN, $shortname, $m)) {
                Log::debug('Moodle sync: skipping course with unrecognised shortname', ['shortname' => $shortname]);
                continue;
            }

            [, $prefix, $department, $code] = $m;

            $subjects = $subjectsByCode->get($code);
            if (! $subjects || $subjects->isEmpty()) {
                Log::debug('Moodle sync: no subject for course', ['shortname' => $shortname]);
                continue;
            }

            $subject = $subjects->first(
                fn (Subject $s) => $s->department !== null && strcasecmp($s->department, $department) === 0
            ) ?? $subjects->first();

            $rank = $this->semesterRank($prefix);
            $candidates[$courseId] = ['subject' => $subject, 'rank' => $rank];
            $current = $bestPerSubject[$subject->id] ?? null;

            if ($current === null
                || $rank > $current['rank']
                || ($rank === $current['rank'] && $courseId > $current['courseId'])) {
                $bestPerSubject[$subject->id] = ['courseId' => $courseId, 'rank' => $rank];
            }
        }

        $result = [];
        foreach ($fullnames as $courseId => $fullname) {
            $candidate = $candidates[$courseId] ?? null;

            if ($candidate === null) {
                $result[$courseId] = new MoodleCourseMatch($courseId, MoodleCourseMatch::UNMATCHED, $fullname);
            } elseif ($bestPerSubject[$candidate['subject']->id]['courseId'] === $courseId) {
                $result[$courseId] = new MoodleCourseMatch($courseId, MoodleCourseMatch::MATCHED, $fullname, $candidate['subject']);
            } else {
                $result[$courseId] = new MoodleCourseMatch($courseId, MoodleCourseMatch::SKIPPED, $fullname, $candidate['subject']);
            }
        }

        return $result;
    }

    /**
     * Sortable rank for a "YYYY-SS" prefix. The year is the academic year
     * (as in STAG), so the winter semester (ZS) precedes the summer one (LS).
     */
    private function semesterRank(string $prefix): int
    {
        [$year, $semester] = explode('-', $prefix);

        $order = match ($semester) {
            'ZS'    => 1,
            'LS'    => 2,
            default => 0,
        };

        return (int) $year * 10 + $order;
    }
}
