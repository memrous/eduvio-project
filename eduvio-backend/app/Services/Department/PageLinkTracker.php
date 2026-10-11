<?php

namespace App\Services\Department;

use App\Models\Material;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Log;

/**
 * Watches pages linked as semester materials: remembers the files and
 * subpages a page links to and reports those that appeared since the last
 * check (teachers add files to their course pages without notice).
 */
class PageLinkTracker
{
    private const MAX_LINKS = 500;
    private const MAX_TEXT_LENGTH = 200;

    /** Linked files count on any host (e.g. lecture recordings on a file server). */
    private const FILE_EXTENSIONS = [
        'pdf', 'ps', 'djvu', 'epub', 'txt', 'md', 'csv', 'tex', 'bib',
        'doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp',
        'zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar',
        'mp4', 'webm', 'mov', 'mkv', 'avi', 'mp3', 'ogg', 'wav',
        'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
        'ipynb', 'py', 'c', 'h', 'cpp', 'java', 'hs', 'lisp', 'scm', 'pl', 'sh', 'sql', 'js',
    ];

    public function __construct(private InfUpolClient $client)
    {
    }

    /**
     * Check one semester link. Pages that cannot be fetched are left as they are.
     *
     * @param  list<string>  $extraHosts  hosts allowed besides the configured ones
     * @return int number of links newly reported
     */
    public function check(Material $material, array $extraHosts = []): int
    {
        $scheme = strtolower((string) parse_url((string) $material->url, PHP_URL_SCHEME));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return 0;
        }

        try {
            $page = $this->client->get($material->url, $extraHosts);
        } catch (DepartmentFetchException $e) {
            Log::warning("Page check failed for material {$material->id}", ['error' => $e->getMessage()]);

            return 0;
        }
        if ($page === null) {
            return 0;
        }

        $links = $this->extractLinks($page['body'], $page['url']);

        return $this->compare($material, $links);
    }

    /**
     * Files and subpages linked from the page: absolute URL + text, without
     * navigation, mailto/tel/javascript links and anchors on the same page.
     * Subpages must be in the page's directory; files may be on any host.
     *
     * @return list<array{url: string, text: string}>
     */
    public function extractLinks(string $html, string $pageUrl): array
    {
        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($document);
        $nodes = $xpath->query(
            '//a[@href][not(ancestor::nav) and not(ancestor::header) and not(ancestor::footer)'
            . ' and not(ancestor::*[@role="navigation"])]'
        );

        $page = $this->withoutFragment($pageUrl);
        $scope = $this->scopeOf($page);

        $links = [];
        foreach ($nodes as $node) {
            /** @var DOMElement $node */
            $href = trim($node->getAttribute('href'));
            if ($href === '' || str_starts_with($href, '#') || preg_match('#^(mailto|tel|javascript|data):#i', $href)) {
                continue;
            }

            $url = $this->withoutFragment(UrlResolver::resolve($pageUrl, $href));
            if ($url === $page || ! ($this->isWithinScope($url, $scope) || $this->isFile($url))) {
                continue;
            }

            $text = trim(preg_replace('/\s+/u', ' ', $node->textContent));
            if ($text === '') {
                $text = trim($node->getAttribute('title')) ?: rawurldecode(basename((string) parse_url($url, PHP_URL_PATH)));
            }

            $links[$url] ??= ['url' => $url, 'text' => mb_substr($text, 0, self::MAX_TEXT_LENGTH)];
            if (count($links) >= self::MAX_LINKS) {
                break;
            }
        }

        return array_values($links);
    }

    /**
     * @param  list<array{url: string, text: string}>  $links
     */
    private function compare(Material $material, array $links): int
    {
        $currentUrls = array_column($links, 'url');

        // First download: only remember the page, nothing is new
        if ($material->page_links === null) {
            $material->update(['page_links' => $links]);

            return 0;
        }

        $knownUrls = array_column($material->page_links, 'url');
        $added = array_values(array_filter($links, fn (array $link) => ! in_array($link['url'], $knownUrls, true)));

        // Unseen links stay reported while they are still on the page
        $stillNew = array_values(array_filter(
            $material->page_links_new ?? [],
            fn (array $link) => in_array($link['url'], $currentUrls, true),
        ));
        $newUrls = array_column($stillNew, 'url');
        foreach ($added as $link) {
            if (! in_array($link['url'], $newUrls, true)) {
                $stillNew[] = $link;
            }
        }

        $attributes = [
            'page_links'     => $links,
            'page_links_new' => $stillNew ?: null,
        ];
        if ($added !== []) {
            $attributes['content_changed_at'] = now();
        }
        $material->update($attributes);

        return count($added);
    }

    /**
     * Subpages and files live in the page's directory on the same host:
     * "http://host/courses/unixs/" covers "http://host/courses/unixs/slides.pdf".
     *
     * @return array{origin: string, dir: string}
     */
    private function scopeOf(string $url): array
    {
        $parts = parse_url($url);
        $path = $parts['path'] ?? '/';

        return [
            'origin' => strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '')),
            'dir'    => substr($path, 0, strrpos($path, '/') + 1),
        ];
    }

    private function isWithinScope(string $url, array $scope): bool
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $origin = strtolower(($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : ''));

        return in_array($scheme, ['http', 'https'], true)
            && $origin === $scope['origin']
            && str_starts_with($parts['path'] ?? '/', $scope['dir']);
    }

    private function isFile(string $url): bool
    {
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $extension = strtolower(pathinfo((string) parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));

        return in_array($scheme, ['http', 'https'], true) && in_array($extension, self::FILE_EXTENSIONS, true);
    }

    private function withoutFragment(string $url): string
    {
        $position = strpos($url, '#');

        return $position === false ? $url : substr($url, 0, $position);
    }
}
