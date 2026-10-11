<?php

namespace App\Services\Department;

/**
 * Minimal robots.txt (RFC 9309) parser: picks the group for our product token,
 * falls back to "*", and matches Allow/Disallow by the longest rule.
 */
class RobotsTxt
{
    /**
     * @return list<array{allow: bool, path: string}>
     */
    public static function parse(string $content, string $productToken): array
    {
        $groups = [];
        $current = null;
        $lastWasAgent = false;

        foreach (preg_split('/\r\n|\r|\n/', $content) as $line) {
            $line = trim(preg_replace('/#.*/', '', $line));
            if ($line === '' || ! str_contains($line, ':')) {
                continue;
            }

            [$field, $value] = array_map('trim', explode(':', $line, 2));
            $field = strtolower($field);

            if ($field === 'user-agent') {
                // Consecutive User-agent lines share one group
                if (! $lastWasAgent) {
                    $groups[] = ['agents' => [], 'rules' => []];
                    $current = array_key_last($groups);
                }
                $groups[$current]['agents'][] = strtolower($value);
                $lastWasAgent = true;
                continue;
            }

            $lastWasAgent = false;
            if ($current === null || ! in_array($field, ['allow', 'disallow'], true)) {
                continue;
            }
            if ($value === '') {
                continue; // empty Disallow allows everything
            }
            $groups[$current]['rules'][] = ['allow' => $field === 'allow', 'path' => $value];
        }

        $token = strtolower($productToken);
        $specific = [];
        $wildcard = [];
        foreach ($groups as $group) {
            foreach ($group['agents'] as $agent) {
                if ($agent === '*') {
                    $wildcard = array_merge($wildcard, $group['rules']);
                } elseif ($agent !== '' && str_contains($token, $agent)) {
                    $specific = array_merge($specific, $group['rules']);
                }
            }
        }

        return $specific ?: $wildcard;
    }

    /**
     * @param  list<array{allow: bool, path: string}>  $rules
     */
    public static function allows(array $rules, string $path): bool
    {
        $best = null;

        foreach ($rules as $rule) {
            if (! self::matches($rule['path'], $path)) {
                continue;
            }
            $length = strlen($rule['path']);
            // Longest match wins; on a tie Allow wins
            if ($best === null || $length > $best['length'] || ($length === $best['length'] && $rule['allow'])) {
                $best = ['length' => $length, 'allow' => $rule['allow']];
            }
        }

        return $best === null || $best['allow'];
    }

    private static function matches(string $pattern, string $path): bool
    {
        $anchored = str_ends_with($pattern, '$');
        if ($anchored) {
            $pattern = substr($pattern, 0, -1);
        }

        $regex = '#^' . str_replace('\*', '.*', preg_quote($pattern, '#')) . ($anchored ? '$' : '') . '#';

        return (bool) preg_match($regex, $path);
    }
}
