<?php

namespace App\Services\Moodle;

use App\Models\Requirement;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MoodleRequirementSync
{
    private const TIMEZONE = 'Europe/Prague';

    public function __construct(private MoodleCourseMatcher $matcher)
    {
    }

    /**
     * Fetch the user's Moodle assignments and upsert them as requirements.
     *
     * @param  array  $courses  Result of core_enrol_get_users_courses.
     * @return int Number of processed assignments.
     */
    public function sync(User $user, MoodleClient $client, array $courses): int
    {
        // course id => ['subject' => Subject, 'fullname' => string]
        $matched = [];
        foreach ($this->matcher->match($user, $courses) as $courseId => $match) {
            if ($match->isMatched()) {
                $matched[$courseId] = ['subject' => $match->subject, 'fullname' => $match->fullname];
            }
        }

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
