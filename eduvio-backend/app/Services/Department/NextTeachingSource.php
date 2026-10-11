<?php

namespace App\Services\Department;

use Carbon\CarbonImmutable;

/**
 * Course pages built with Next.js that load their content client-side through
 * the server action "getContentByUris" (e.g. jakubjuracka.cz/teaching/<group>/<subject>).
 * The static HTML holds no schedule, so the action is called the way the page
 * calls it. Its id changes with every deploy of the site, so it is read from
 * the page's JavaScript chunk on every sync.
 */
class NextTeachingSource
{
    private const ACTION_NAME = 'getContentByUris';
    private const TIMELINE = 1;
    private const TEXT = 0;

    public function __construct(private InfUpolClient $client)
    {
    }

    public function supports(string $html, string $pageUrl): bool
    {
        return str_contains($html, 'self.__next_f')
            && $this->actionArgs($pageUrl) !== null
            && $this->pageChunkUrls($html, $pageUrl) !== [];
    }

    /**
     * Dated schedule rows and the HTML of the text sections.
     *
     * @return array{blocks: list<array{date: string, title: string, description: ?string, links: list<array{text: string, url: string}>}>, html: string}|null
     *         null when the content could not be loaded (unknown outcome)
     *
     * @throws DepartmentFetchException
     */
    public function fetch(string $html, string $pageUrl, array $extraHosts = []): ?array
    {
        $actionId = $this->findActionId($html, $pageUrl, $extraHosts);
        if ($actionId === null) {
            return null;
        }

        $body = $this->client->postServerAction($pageUrl, $actionId, $this->actionArgs($pageUrl), $extraHosts);
        if ($body === null) {
            return null;
        }

        $content = FlightPayload::parse($body)->result();
        if (! is_array($content) || ! is_array($content['sections'] ?? null)) {
            return null;
        }

        return $this->read($content, $pageUrl);
    }

    /**
     * @return array{blocks: list<array>, html: string}
     */
    public function read(array $content, string $pageUrl): array
    {
        $origin = $this->origin($pageUrl);
        [$group, $subject] = $this->actionArgs($pageUrl) ?? ['', ''];
        $blocks = [];
        $html = '';

        foreach ($content['sections'] as $section) {
            foreach ((array) ($section['contents'] ?? []) as $item) {
                $type = (int) ($item['type'] ?? -1);
                if ($type === self::TEXT && is_string($item['content'] ?? null)) {
                    $html .= '<section><h2>' . htmlspecialchars((string) ($section['title'] ?? '')) . '</h2>' . $item['content'] . '</section>';
                    continue;
                }
                if ($type !== self::TIMELINE) {
                    continue;
                }
                foreach ((array) ($item['items'] ?? []) as $row) {
                    $date = $this->date($row['date'] ?? null);
                    if ($date === null) {
                        continue;
                    }
                    $blocks[] = [
                        'date'        => $date,
                        'title'       => trim(strip_tags((string) ($row['title'] ?? ''))),
                        'description' => trim(strip_tags((string) ($row['description'] ?? ''))) ?: null,
                        'links'       => $this->links($row, $origin, $group, $subject),
                    ];
                }
            }
        }

        return ['blocks' => $blocks, 'html' => $html];
    }

    /** "$D2026-10-06T22:00:00.000Z" → "2026-10-07" (dates are local midnights in Prague). */
    private function date(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $value = str_starts_with($value, '$D') ? substr($value, 2) : $value;
        try {
            return CarbonImmutable::parse($value)->setTimezone('Europe/Prague')->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /** @return list<array{text: string, url: string}> */
    private function links(array $row, string $origin, string $group, string $subject): array
    {
        $links = [];
        foreach ((array) ($row['files'] ?? []) as $file) {
            if (! empty($file['url_name']) && ! empty($file['name'])) {
                $links[] = [
                    'text' => mb_substr((string) $file['name'], 0, 255),
                    'url'  => $origin . '/api/files/download/' . rawurlencode((string) $file['url_name']),
                ];
            }
        }
        foreach ((array) ($row['materials'] ?? []) as $material) {
            $slug = $material['material_slug'] ?? $material['slug'] ?? null;
            $title = $material['material_title'] ?? $material['title'] ?? null;
            if ($slug && $title) {
                $links[] = [
                    'text' => mb_substr((string) $title, 0, 255),
                    'url'  => $origin . '/teaching/materials/' . rawurlencode((string) $slug)
                        . '?g=' . rawurlencode($group) . '&s=' . rawurlencode($subject),
                ];
            }
        }
        if (! empty($row['link_url']) && preg_match('#^https?://#i', (string) $row['link_url'])) {
            $links[] = ['text' => mb_substr((string) ($row['link_title'] ?? $row['link_url']), 0, 255), 'url' => (string) $row['link_url']];
        }

        return $links;
    }

    private function findActionId(string $html, string $pageUrl, array $extraHosts): ?string
    {
        foreach ($this->pageChunkUrls($html, $pageUrl) as $chunkUrl) {
            $chunk = $this->client->get($chunkUrl, $extraHosts);
            if ($chunk !== null && preg_match(
                '/createServerReference\)\("([0-9a-f]{16,64})",[^)]*?"' . self::ACTION_NAME . '"\)/',
                $chunk['body'],
                $m
            )) {
                return $m[1];
            }
        }

        return null;
    }

    /** @return list<string> */
    private function pageChunkUrls(string $html, string $pageUrl): array
    {
        preg_match_all('#src="(/_next/static/chunks/app/[^"]*/page-[0-9a-f]+\.js)"#', $html, $m);

        return array_values(array_unique(array_map(fn ($src) => UrlResolver::resolve($pageUrl, $src), $m[1])));
    }

    /** "/teaching/2026-2027-ZS/ZPP1" → ["2026-2027-ZS", "ZPP1"] */
    private function actionArgs(string $pageUrl): ?array
    {
        $segments = array_values(array_filter(explode('/', (string) parse_url($pageUrl, PHP_URL_PATH))));
        $index = array_search('teaching', $segments, true);
        if ($index === false || count($segments) !== $index + 3) {
            return null;
        }

        return [rawurldecode($segments[$index + 1]), rawurldecode($segments[$index + 2])];
    }

    private function origin(string $pageUrl): string
    {
        $parts = parse_url($pageUrl);

        return strtolower($parts['scheme']) . '://' . strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
    }
}
