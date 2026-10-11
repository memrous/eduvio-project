<?php

namespace App\Services\Department;

/**
 * Resolves links found on a page (absolute, scheme-relative, root-relative,
 * relative, query or fragment only) against the page URL.
 */
class UrlResolver
{
    public static function resolve(string $base, string $href): string
    {
        $href = trim($href);

        if ($href === '') {
            return $base;
        }
        if (preg_match('#^[a-z][a-z0-9+.-]*:#i', $href)) {
            return $href;
        }

        $parts = parse_url($base);
        $scheme = $parts['scheme'] ?? 'https';
        $authority = ($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '');
        $path = $parts['path'] ?? '/';
        $query = isset($parts['query']) ? '?' . $parts['query'] : '';

        if (str_starts_with($href, '//')) {
            return "{$scheme}:{$href}";
        }
        if (str_starts_with($href, '#')) {
            return "{$scheme}://{$authority}{$path}{$query}{$href}";
        }
        if (str_starts_with($href, '?')) {
            return "{$scheme}://{$authority}{$path}{$href}";
        }

        if (str_starts_with($href, '/')) {
            $merged = $href;
        } else {
            $dir = str_contains($path, '/') ? substr($path, 0, strrpos($path, '/') + 1) : '/';
            $merged = $dir . $href;
        }

        return "{$scheme}://{$authority}" . self::removeDotSegments($merged);
    }

    private static function removeDotSegments(string $path): string
    {
        $suffix = '';
        if (preg_match('/^([^?#]*)([?#].*)$/', $path, $m)) {
            [$path, $suffix] = [$m[1], $m[2]];
        }

        $output = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '..') {
                if (count($output) > 1) {
                    array_pop($output);
                }
            } elseif ($segment !== '.') {
                $output[] = $segment;
            }
        }

        $result = implode('/', $output);
        if (preg_match('#/\.{1,2}$#', $path)) {
            $result .= '/';
        }

        return ($result === '' ? '/' : $result) . $suffix;
    }
}
