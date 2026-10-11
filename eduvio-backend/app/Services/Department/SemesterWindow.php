<?php

namespace App\Services\Department;

use Carbon\CarbonImmutable;

/**
 * Dates of a semester from the STAG value "ZS 2026" / "LS 2026" (the year is
 * the first year of the academic year, so LS 2026 is spring 2027).
 * Used to add the year to "7. 10." and to drop dates of other semesters
 * (e.g. lecture slides from 2020 on an old course page).
 */
class SemesterWindow
{
    private function __construct(
        public readonly ?string $type,      // ZS | LS | null (unknown)
        public readonly ?int $academicYear,
    ) {
    }

    public static function fromSemester(?string $semester): self
    {
        if (preg_match('/^\s*(ZS|LS)\s+(\d{4})/i', (string) $semester, $m)) {
            return new self(strtoupper($m[1]), (int) $m[2]);
        }

        return new self(null, null);
    }

    public function isKnown(): bool
    {
        return $this->type !== null;
    }

    /** "ZS 2026" heading marker in normalized text, e.g. "vyuka v zs 2026". */
    public function marker(): ?string
    {
        return $this->isKnown() ? strtolower($this->type) . ' ' . $this->academicYear : null;
    }

    /** Year of a date written without one. */
    public function yearFor(int $month): ?int
    {
        if ($this->type === 'ZS') {
            return $month >= 8 ? $this->academicYear : $this->academicYear + 1;
        }
        if ($this->type === 'LS') {
            return $this->academicYear + 1;
        }

        return null;
    }

    /**
     * Whether the date belongs to the semester (with its exam period). For an
     * unknown semester, dates within a year from today are accepted.
     */
    public function contains(CarbonImmutable $date, ?CarbonImmutable $today = null): bool
    {
        if ($this->type === 'ZS') {
            return $date->betweenIncluded(
                CarbonImmutable::create($this->academicYear, 9, 1),
                CarbonImmutable::create($this->academicYear + 1, 2, 1)->endOfMonth(),
            );
        }
        if ($this->type === 'LS') {
            return $date->betweenIncluded(
                CarbonImmutable::create($this->academicYear + 1, 2, 1),
                CarbonImmutable::create($this->academicYear + 1, 9, 30),
            );
        }

        $today ??= CarbonImmutable::today('Europe/Prague');

        return $date->betweenIncluded($today->subYear(), $today->addYear());
    }
}
