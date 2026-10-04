<?php

namespace App\Services\Moodle;

use App\Models\Subject;

class MoodleCourseMatch
{
    /** The course is paired with one of the user's subjects. */
    public const MATCHED = 'matched';

    /** The course has no subject (unrecognised shortname or no matching subject). */
    public const UNMATCHED = 'unmatched';

    /** The course maps to a subject, but a newer semester course for it exists. */
    public const SKIPPED = 'skipped';

    public function __construct(
        public readonly int $courseId,
        public readonly string $status,
        public readonly string $fullname,
        public readonly ?Subject $subject = null,
    ) {
    }

    public function isMatched(): bool
    {
        return $this->status === self::MATCHED;
    }

    public function isSkipped(): bool
    {
        return $this->status === self::SKIPPED;
    }
}
