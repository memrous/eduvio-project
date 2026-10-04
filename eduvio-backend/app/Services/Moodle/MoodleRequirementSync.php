<?php

namespace App\Services\Moodle;

use App\Models\Requirement;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MoodleRequirementSync
{
    /**
     * Course shortname, e.g. "2026-ZS-KAG/MR-Prezenční-ZS-":
     * 1 = year-semester prefix, 2 = department, 3 = subject code.
     */
    private const SHORTNAME_PATTERN = '#^(\d{4}-[A-Z]{2})-([A-Za-z0-9]+)/([A-Za-z0-9]+)(?:-|$)#u';

    private const TIMEZONE = 'Europe/Prague';

    /**
     * Fetch the user's Moodle assignments and upsert them as requirements.
     *
     * @return int Number of processed assignments.
     */
    public function sync(User $user, MoodleClient $client): int
    {
        if (empty($user->moodle_user_id)) {
            throw new RuntimeException('Moodle user id missing, please reconnect.');
        }

        $courses = $client->call('core_enrol_get_users_courses', [
            'userid' => $user->moodle_user_id,
        ]);

        // course id => ['subject' => Subject, 'fullname' => string]
        $matched = $this->matchCoursesToSubjects($user, $courses);

        if ($matched === []) {
            return 0;
        }

        $response = $client->call('mod_assign_get_assignments', [
            'courseids' => array_keys($matched),
        ]);

        // Collect everything over HTTP first, then write in a single transaction.
        $rows = [];
        foreach ($response['courses'] ?? [] as $course) {
            $courseId = (int) ($course['id'] ?? 0);
            if (! isset($matched[$courseId])) {
                continue;
            }

            foreach ($course['assignments'] ?? [] as $assignment) {
                $rows[] = [
                    'subject_id' => $matched[$courseId]['subject']->id,
                    'assignment' => $assignment,
                    'completed'  => $this->isSubmitted($client, (int) $assignment['id']),
                    'context'    => 'Moodle: ' . $matched[$courseId]['fullname'],
                ];
            }
        }

        DB::transaction(function () use ($rows) {
            foreach ($rows as $row) {
                $assignment = $row['assignment'];
                [$dueDate, $dueTime] = $this->dueDateParts((int) ($assignment['duedate'] ?? 0));
                $grade = (float) ($assignment['grade'] ?? 0);

                $requirement = Requirement::firstOrNew([
                    'subject_id'           => $row['subject_id'],
                    'moodle_assignment_id' => (int) $assignment['id'],
                ]);

                // gained_points, grade and weight are intentionally not touched.
                $requirement->fill([
                    'title'      => $assignment['name'] ?? 'Moodle assignment',
                    'type'       => 'homework',
                    'due_date'   => $dueDate,
                    'due_time'   => $dueTime,
                    'max_points' => $grade > 0 ? (int) round($grade) : null,
                    'context'    => $row['context'],
                ]);

                // Unknown submission status: keep the stored value, default new records to false.
                if ($row['completed'] !== null) {
                    $requirement->completed = $row['completed'];
                } elseif (! $requirement->exists) {
                    $requirement->completed = false;
                }

                $requirement->save();
            }
        });

        return count($rows);
    }

    /**
     * Pair Moodle courses with the user's subjects. When several courses point
     * to the same subject, only the one with the newest year-semester prefix wins.
     *
     * @return array<int, array{subject: Subject, fullname: string}>
     */
    private function matchCoursesToSubjects(User $user, array $courses): array
    {
        /** @var Collection<string, Collection<int, Subject>> $subjectsByCode */
        $subjectsByCode = Subject::where('user_id', $user->id)->orderBy('id')->get()->groupBy('code');

        // subject id => ['courseId', 'rank', 'subject', 'fullname']
        $bestPerSubject = [];

        foreach ($courses as $course) {
            $shortname = (string) ($course['shortname'] ?? '');

            if (! preg_match(self::SHORTNAME_PATTERN, $shortname, $m)) {
                Log::debug('Moodle sync: skipping course with unrecognised shortname', ['shortname' => $shortname]);
                continue;
            }

            [, $prefix, $department, $code] = $m;

            $candidates = $subjectsByCode->get($code);
            if (! $candidates || $candidates->isEmpty()) {
                Log::debug('Moodle sync: no subject for course', ['shortname' => $shortname]);
                continue;
            }

            $subject = $candidates->first(
                fn (Subject $s) => $s->department !== null && strcasecmp($s->department, $department) === 0
            ) ?? $candidates->first();

            $courseId = (int) $course['id'];
            $rank = $this->semesterRank($prefix);
            $current = $bestPerSubject[$subject->id] ?? null;

            if ($current === null
                || $rank > $current['rank']
                || ($rank === $current['rank'] && $courseId > $current['courseId'])) {
                $bestPerSubject[$subject->id] = [
                    'courseId' => $courseId,
                    'rank'     => $rank,
                    'subject'  => $subject,
                    'fullname' => (string) ($course['fullname'] ?? $shortname),
                ];
            }
        }

        $matched = [];
        foreach ($bestPerSubject as $entry) {
            $matched[$entry['courseId']] = [
                'subject'  => $entry['subject'],
                'fullname' => $entry['fullname'],
            ];
        }

        return $matched;
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

    /**
     * @return bool|null Null when the submission status could not be determined.
     */
    private function isSubmitted(MoodleClient $client, int $assignId): ?bool
    {
        try {
            $status = $client->call('mod_assign_get_submission_status', ['assignid' => $assignId]);
        } catch (MoodleApiException $e) {
            Log::warning("Moodle sync: submission status failed for assignment {$assignId}: {$e->errorcode}");
            return null;
        }

        $lastAttempt = $status['lastattempt'] ?? [];

        return ($lastAttempt['submission']['status'] ?? null) === 'submitted'
            || ($lastAttempt['teamsubmission']['status'] ?? null) === 'submitted';
    }

    /**
     * @return array{0: ?string, 1: ?string} [Y-m-d, H:i] in Europe/Prague, or nulls when there is no due date.
     */
    private function dueDateParts(int $timestamp): array
    {
        if ($timestamp <= 0) {
            return [null, null];
        }

        $date = Carbon::createFromTimestamp($timestamp, self::TIMEZONE);

        return [$date->format('Y-m-d'), $date->format('H:i')];
    }
}
