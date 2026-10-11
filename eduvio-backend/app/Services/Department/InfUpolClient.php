<?php

namespace App\Services\Department;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Polite HTTP client for department websites: own User-Agent, robots.txt,
 * at most one request per interval, manual redirects with loop protection
 * and a shared 24h cache of fetched pages.
 */
class InfUpolClient
{
    private const PAGE_CACHE_PREFIX = 'department-http:page:';
    private const ROBOTS_CACHE_PREFIX = 'department-http:robots:';
    private const THROTTLE_LOCK = 'department-http:throttle';
    private const LAST_REQUEST_KEY = 'department-http:last-request';

    /**
     * Fetch a page as UTF-8 HTML.
     *
     * @param  list<string>  $extraHosts  hosts allowed besides config('departments.fetch_host_suffixes')
     * @return array{url: string, body: string}|null  null when the page does not
     *         exist, robots.txt disallows it or its host is not allowed
     *
     * @throws DepartmentFetchException when the outcome is unknown
     */
    public function get(string $url, array $extraHosts = []): ?array
    {
        if (! $this->isFetchableUrl($url, $extraHosts)) {
            return null;
        }

        $cacheKey = self::PAGE_CACHE_PREFIX . sha1($url);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached['page'];
        }

        $page = $this->fetch($url, $extraHosts);
        if ($page === false) {
            return null; // redirected to a host not allowed for this caller; not cached
        }
        Cache::put($cacheKey, ['page' => $page], $this->cacheTtl());

        return $page;
    }

    public function userAgent(): string
    {
        return 'EduvioBot/1.0 (+' . config('departments.contact') . ')';
    }

    /**
     * @return array{url: string, body: string}|null|false  false when a redirect
     *         leads to a host that is not allowed
     */
    private function fetch(string $url, array $extraHosts): array|null|false
    {
        $current = $url;
        $visited = [];
        $maxRedirects = (int) config('departments.max_redirects', 5);

        for ($hop = 0; $hop <= $maxRedirects; $hop++) {
            if (! $this->isFetchableUrl($current, $extraHosts)) {
                return false;
            }
            if (in_array($current, $visited, true)) {
                throw new DepartmentFetchException("Redirect loop at {$current}");
            }
            $visited[] = $current;

            if (! $this->robotsAllows($current)) {
                return null;
            }

            $response = $this->request($current);

            if ($response->redirect()) {
                $location = $response->header('Location');
                if ($location === '') {
                    throw new DepartmentFetchException("Redirect without Location from {$current}");
                }
                $current = UrlResolver::resolve($current, $location);
                continue;
            }

            if (in_array($response->status(), [404, 410], true)) {
                return null;
            }
            if (! $response->successful()) {
                throw new DepartmentFetchException("HTTP {$response->status()} from {$current}");
            }

            return [
                'url'  => $current,
                'body' => $this->toUtf8($response->body(), $response->header('Content-Type')),
            ];
        }

        throw new DepartmentFetchException("Too many redirects from {$url}");
    }

    private function request(string $url): Response
    {
        $this->throttle();

        try {
            return Http::withHeaders(['User-Agent' => $this->userAgent()])
                ->timeout((int) config('departments.timeout_seconds', 10))
                ->withOptions(['allow_redirects' => false])
                ->get($url);
        } catch (ConnectionException $e) {
            throw new DepartmentFetchException("Connection failed for {$url}", 0, $e);
        }
    }

    /**
     * Keep at least the configured interval between any two requests,
     * across all workers.
     */
    private function throttle(): void
    {
        $intervalMs = (int) config('departments.min_request_interval_ms', 1000);
        if ($intervalMs <= 0) {
            return;
        }

        Cache::lock(self::THROTTLE_LOCK, 30)->block(30, function () use ($intervalMs) {
            $last = (float) Cache::get(self::LAST_REQUEST_KEY, 0);
            $waitSeconds = $last + $intervalMs / 1000 - microtime(true);
            if ($waitSeconds > 0) {
                usleep((int) ceil($waitSeconds * 1_000_000));
            }
            Cache::put(self::LAST_REQUEST_KEY, microtime(true), 60);
        });
    }

    private function isFetchableUrl(string $url, array $extraHosts = []): bool
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower($parts['host'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return false;
        }

        if (in_array($host, array_map('strtolower', $extraHosts), true)) {
            return true;
        }

        foreach ((array) config('departments.fetch_host_suffixes', []) as $suffix) {
            $suffix = strtolower($suffix);
            if ($host === $suffix || str_ends_with($host, '.' . $suffix)) {
                return true;
            }
        }

        return false;
    }

    // ─── robots.txt ──────────────────────────────────────────────

    private function robotsAllows(string $url): bool
    {
        $parts = parse_url($url);
        $origin = strtolower($parts['scheme']) . '://' . strtolower($parts['host'])
            . (isset($parts['port']) ? ':' . $parts['port'] : '');

        $rules = Cache::remember(
            self::ROBOTS_CACHE_PREFIX . sha1($origin),
            $this->cacheTtl(),
            fn () => $this->fetchRobotsRules($origin),
        );

        $path = ($parts['path'] ?? '/') . (isset($parts['query']) ? '?' . $parts['query'] : '');

        return RobotsTxt::allows($rules, $path);
    }

    private function fetchRobotsRules(string $origin): array
    {
        $current = $origin . '/robots.txt';

        // robots.txt may itself redirect (e.g. http → https)
        for ($hop = 0; $hop <= (int) config('departments.max_redirects', 5); $hop++) {
            $response = $this->request($current);

            if ($response->redirect() && $response->header('Location') !== '') {
                $current = UrlResolver::resolve($current, $response->header('Location'));
                continue;
            }
            if ($response->successful()) {
                return RobotsTxt::parse($response->body(), 'EduvioBot');
            }
            if ($response->clientError()) {
                return []; // no robots.txt → everything allowed
            }

            throw new DepartmentFetchException("robots.txt unavailable at {$origin} (HTTP {$response->status()})");
        }

        throw new DepartmentFetchException("Too many redirects for robots.txt at {$origin}");
    }

    // ─── Encoding ────────────────────────────────────────────────

    /**
     * Convert the body to UTF-8 using the charset from the Content-Type header,
     * then from a <meta> tag (e.g. windows-1250 personal pages).
     */
    private function toUtf8(string $body, string $contentType): string
    {
        $charset = null;
        if (preg_match('/charset\s*=\s*["\']?([\w-]+)/i', $contentType, $m)) {
            $charset = $m[1];
        } elseif (preg_match('/<meta[^>]+charset\s*=\s*["\']?([\w-]+)/i', substr($body, 0, 4096), $m)) {
            $charset = $m[1];
        }

        $charset = $charset ? strtoupper($charset) : (mb_check_encoding($body, 'UTF-8') ? 'UTF-8' : 'WINDOWS-1250');

        if ($charset !== 'UTF-8' && $charset !== 'UTF8') {
            $converted = @iconv($charset, 'UTF-8//IGNORE', $body);
            if ($converted !== false) {
                $body = $converted;
            }
        }

        // The page is UTF-8 now; keep the HTML parser from re-decoding it
        return preg_replace('/(<meta[^>]+charset\s*=\s*["\']?)[\w-]+/i', '${1}utf-8', $body);
    }

    private function cacheTtl(): \DateTimeInterface
    {
        return now()->addHours((int) config('departments.cache_ttl_hours', 24));
    }
}
