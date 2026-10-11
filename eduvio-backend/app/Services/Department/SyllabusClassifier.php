<?php

namespace App\Services\Department;

use App\Models\SyllabusItem;

/**
 * Kind of a schedule row from its title (Czech keywords, compared without
 * diacritics and case).
 */
class SyllabusClassifier
{
    /** "  Zápočtová   PÍSEMKA " → "zapoctova pisemka" */
    public static function normalize(?string $text): string
    {
        $text = (string) $text;
        $ascii = class_exists(\Normalizer::class)
            ? preg_replace('/\p{Mn}+/u', '', \Normalizer::normalize($text, \Normalizer::FORM_D))
            : $text;
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', (string) $ascii) ?: (string) $ascii;

        return trim(preg_replace('/\s+/', ' ', mb_strtolower($ascii)));
    }

    /**
     * @return array{0: string, 1: string|null} [kind, assessment type]
     */
    public static function classify(string $title): array
    {
        $t = self::normalize($title);

        if (preg_match('/\b(statni svatek|dekanske volno|rektorske volno)\b/', $t)) {
            return [SyllabusItem::KIND_HOLIDAY, null];
        }
        // Projects count only when something is handed in or defended
        if (preg_match('/\bprojekt/', $t) && preg_match('/\b(odevzd|obhajob)/', $t)) {
            return [SyllabusItem::KIND_ASSESSMENT, 'project'];
        }
        if (preg_match('/\boprav(a|y|e|u|ny|na|ne|neho|nou)?\b/', $t)) {
            return [SyllabusItem::KIND_ASSESSMENT, 'retake'];
        }
        if (preg_match('/\bzapoctov\w* (pisemk\w*|pisemn\w* prac\w*|test\w{0,2})\b/', $t)) {
            return [SyllabusItem::KIND_ASSESSMENT, 'credit_test'];
        }
        if (preg_match('/\bzkousk\w*\b/', $t)) {
            return [SyllabusItem::KIND_ASSESSMENT, 'exam'];
        }
        if (preg_match('/\b(odevzdani|deadline)\b/', $t)) {
            return [SyllabusItem::KIND_ASSESSMENT, 'deadline'];
        }
        if (preg_match('/\b(pisemn\w* prac\w*|pisemk\w*|test\w{0,2}|kviz\w{0,2})\b/', $t)) {
            return [SyllabusItem::KIND_ASSESSMENT, 'test'];
        }

        return [SyllabusItem::KIND_SESSION, null];
    }
}
