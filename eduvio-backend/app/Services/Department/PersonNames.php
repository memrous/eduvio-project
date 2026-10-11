<?php

namespace App\Services\Department;

use Illuminate\Support\Str;

/**
 * Names of people as STAG and department pages write them, with academic
 * titles before ("doc. RNDr.") and after the name (", Ph.D., DSc.").
 */
class PersonNames
{
    /** Titles written after the name (lowercase), also without a trailing dot. */
    private const SUFFIX_TITLES = [
        'ph.d.', 'phd.', 'phd', 'csc.', 'dsc.', 'drsc.', 'th.d.', 'dr.', 'dr.h.c.',
        'mba', 'll.m.', 'dis.', 'msc.', 'bsc.', 'ma', 'ba', 'mph', 'et',
    ];

    /**
     * Split a list like "Mgr. Jan Novák, RNDr. Petr Dvořák, Ph.D., DSc." into
     * people; a comma before a title after the name is not a separator.
     *
     * @return list<string>
     */
    public static function split(?string $text): array
    {
        $people = [];

        foreach (explode(',', (string) $text) as $part) {
            $part = trim(preg_replace('/\s+/u', ' ', $part));
            if ($part === '') {
                continue;
            }

            if ($people !== [] && self::isSuffixTitle($part)) {
                $people[array_key_last($people)] .= ', ' . $part;
            } else {
                $people[] = $part;
            }
        }

        return $people;
    }

    /**
     * Comparable key: no titles, no diacritics, lowercase, single spaces.
     * "doc. Mgr. Jan Outrata, Ph.D." → "jan outrata"
     */
    public static function normalize(string $name): string
    {
        $words = array_map(
            fn (string $word) => strtolower(Str::ascii($word)),
            self::nameWords($name),
        );

        return implode(' ', $words);
    }

    /** "doc. Mgr. Jan Outrata, Ph.D." → "Jan Outrata" */
    public static function displayName(string $name): string
    {
        return implode(' ', self::nameWords($name));
    }

    /** "doc. Mgr. Jan Outrata, Ph.D." → "Outrata" */
    public static function surname(string $name): string
    {
        $words = self::nameWords($name);

        return (string) end($words);
    }

    /**
     * @return list<string>
     */
    private static function nameWords(string $name): array
    {
        $words = preg_split('/[\s,]+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_filter($words, fn (string $word) => ! self::isTitleWord($word)));
    }

    private static function isSuffixTitle(string $part): bool
    {
        foreach (preg_split('/\s+/u', $part) as $word) {
            if (! in_array(mb_strtolower($word), self::SUFFIX_TITLES, true)) {
                return false;
            }
        }

        return true;
    }

    private static function isTitleWord(string $word): bool
    {
        // Prefix titles always end with a dot (Mgr., RNDr., doc., MDDr., ...)
        return str_ends_with($word, '.') || in_array(mb_strtolower($word), self::SUFFIX_TITLES, true);
    }
}
