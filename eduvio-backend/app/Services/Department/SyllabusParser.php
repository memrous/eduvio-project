<?php

namespace App\Services\Department;

use App\Models\Subject;
use Carbon\CarbonImmutable;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

/**
 * Semester schedule and exam-topic links on a teacher's course page.
 *
 * The page is read as lines of text (block elements, table rows). A schedule
 * row starts with a line beginning with a date ("7. 10. 2026", "7.10.2026",
 * "7. 10.") and runs until the next dated line or heading: the rest of the
 * dated line (or the next line) is the title, the other lines the description.
 * Dates outside the subject's semester are dropped; fewer than three rows
 * means the page has no schedule.
 */
class SyllabusParser
{
    public const MIN_ROWS = 3;
    private const MAX_DESCRIPTION = 2000;
    private const MAX_TITLE = 500;

    private const BLOCK_TAGS = [
        'p', 'div', 'li', 'tr', 'ul', 'ol', 'table', 'tbody', 'thead', 'section', 'article', 'main',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'aside', 'figure',
    ];
    private const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    private const SKIPPED_TAGS = ['script', 'style', 'noscript', 'template', 'nav', 'header', 'footer', 'iframe', 'svg'];
    private const CELL_TAGS = ['td', 'th'];

    private const DATE_AT_START = '/^\s*(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{4}))?(?![\d.])/u';
    private const TOPIC_TEXT = '/(okruh|otazky ke zkousce|zkouskove otazky)/';
    private const COURSE_CODE = '/\b[a-z]{2,5}\/[a-z0-9]{2,10}\b/';

    /**
     * @return array{items: list<array>, topics: list<array{text: string, url: string}>}
     */
    public function parse(string $html, string $pageUrl, Subject $subject): array
    {
        $document = $this->load($html);
        $xpath = new DOMXPath($document);
        foreach (self::SKIPPED_TAGS as $tag) {
            foreach (iterator_to_array($document->getElementsByTagName($tag)) as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        $body = $document->getElementsByTagName('body')->item(0) ?? $document->documentElement;
        $lines = [];
        $current = $this->emptyLine();
        if ($body) {
            $this->collectLines($body, $pageUrl, $lines, $current);
        }
        $this->flush($lines, $current);

        return [
            'items'  => $this->buildItems($this->blocks($lines, $subject), $subject),
            'topics' => $this->topicLinks($xpath, $pageUrl, $subject),
        ];
    }

    /**
     * Classified items from dated blocks (also used for structured sources).
     *
     * @param  list<array{date: string, title: string, description: ?string, links: list<array{text: string, url: string}>}>  $blocks
     *         date as Y-m-d
     * @return list<array{date: string, title: string, description: ?string, links: list<array>, kind: string, assessment_type: ?string, source_hash: string}>
     */
    public function buildItems(array $blocks, Subject $subject): array
    {
        $window = SemesterWindow::fromSemester($subject->semester);
        $items = [];
        foreach ($blocks as $block) {
            $title = $this->clean($block['title'] ?? '');
            if ($title === '' || ! $window->contains(CarbonImmutable::parse($block['date']))) {
                continue;
            }
            $title = mb_substr($title, 0, self::MAX_TITLE);
            $hash = sha1($block['date'] . '|' . SyllabusClassifier::normalize($title));
            if (isset($items[$hash])) {
                continue;
            }
            [$kind, $assessmentType] = SyllabusClassifier::classify($title);
            $description = $this->clean($block['description'] ?? '');

            $items[$hash] = [
                'date'            => $block['date'],
                'title'           => $title,
                'description'     => $description === '' ? null : mb_substr($description, 0, self::MAX_DESCRIPTION),
                'links'           => array_values($this->uniqueLinks($block['links'] ?? [])),
                'kind'            => $kind,
                'assessment_type' => $assessmentType,
                'source_hash'     => $hash,
            ];
        }

        return count($items) >= self::MIN_ROWS ? array_values($items) : [];
    }

    // ─── Lines ───────────────────────────────────────────────────

    private function load(string $html): DOMDocument
    {
        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $document;
    }

    private function emptyLine(): array
    {
        return ['text' => '', 'links' => [], 'heading' => false];
    }

    private function flush(array &$lines, array &$current): void
    {
        // One line of the page: source line breaks inside a paragraph are spaces
        $text = trim(preg_replace('/\s+/u', ' ', $this->clean($current['text'])));
        if ($text !== '' || $current['heading']) {
            $lines[] = ['text' => $text, 'links' => $current['links'], 'heading' => $current['heading']];
        }
        $current = $this->emptyLine();
    }

    private function collectLines(DOMNode $node, string $pageUrl, array &$lines, array &$current): void
    {
        foreach ($node->childNodes as $child) {
            if ($child->nodeType === XML_TEXT_NODE) {
                $current['text'] .= $child->textContent;
                continue;
            }
            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);
            if ($tag === 'br') {
                $this->flush($lines, $current);
                continue;
            }
            if (in_array($tag, self::CELL_TAGS, true)) {
                $current['text'] .= ' ';
                $this->collectLines($child, $pageUrl, $lines, $current);
                $current['text'] .= ' ';
                continue;
            }
            if ($tag === 'a') {
                $text = $this->clean($child->textContent);
                $url = $this->absoluteUrl($pageUrl, $child->getAttribute('href'));
                if ($url !== null && $text !== '') {
                    $current['links'][] = ['text' => mb_substr($text, 0, 255), 'url' => $url];
                }
                $current['text'] .= ' ' . $child->textContent . ' ';
                continue;
            }

            $isBlock = in_array($tag, self::BLOCK_TAGS, true);
            if ($isBlock) {
                $this->flush($lines, $current);
            }
            if (in_array($tag, self::HEADING_TAGS, true)) {
                $current['heading'] = true;
            }
            $this->collectLines($child, $pageUrl, $lines, $current);
            if ($isBlock) {
                $this->flush($lines, $current);
            }
        }
    }

    /**
     * @return list<array{date: string, title: string, description: ?string, links: list<array>}>
     */
    private function blocks(array $lines, Subject $subject): array
    {
        $window = SemesterWindow::fromSemester($subject->semester);
        $blocks = [];
        $block = null;

        $close = function () use (&$blocks, &$block) {
            if ($block !== null) {
                if ($block['title'] === '' && $block['lines'] !== []) {
                    $block['title'] = array_shift($block['lines']);
                }
                $blocks[] = [
                    'date'        => $block['date'],
                    'title'       => $block['title'],
                    'description' => implode("\n", $block['lines']),
                    'links'       => $block['links'],
                ];
            }
            $block = null;
        };

        foreach ($lines as $line) {
            $date = $line['heading'] ? null : $this->dateAtStart($line['text'], $window);
            if ($date !== null) {
                $close();
                $block = [
                    'date'  => $date['date'],
                    'title' => $date['rest'],
                    'lines' => [],
                    'links' => $line['links'],
                ];
                continue;
            }
            if ($line['heading']) {
                $close(); // a heading ends the schedule row (e.g. "Podmínky zápočtu" below the plan)
                continue;
            }
            if ($block !== null && $line['text'] !== '') {
                // A line that is only links adds the links, not their text, to the row
                if (! $this->isOnlyLinks($line)) {
                    $block['lines'][] = $line['text'];
                }
                array_push($block['links'], ...$line['links']);
            }
        }
        $close();

        return $blocks;
    }

    private function isOnlyLinks(array $line): bool
    {
        if ($line['links'] === []) {
            return false;
        }
        $rest = $line['text'];
        foreach ($line['links'] as $link) {
            $rest = str_replace($link['text'], '', $rest);
        }

        return trim(preg_replace('/[\s,;|·•\-–]+/u', '', $rest)) === '';
    }

    /**
     * @return array{date: string, rest: string}|null
     */
    private function dateAtStart(string $text, SemesterWindow $window): ?array
    {
        if (! preg_match(self::DATE_AT_START, $text, $m)) {
            return null;
        }
        $day = (int) $m[1];
        $month = (int) $m[2];
        $year = isset($m[3]) && $m[3] !== '' ? (int) $m[3] : $window->yearFor($month);
        if ($year === null || ! checkdate($month, $day, $year)) {
            return null;
        }

        $rest = trim(preg_replace('/^[\s\-–—:|,]+/u', '', mb_substr($text, mb_strlen($m[0]))));

        return ['date' => sprintf('%04d-%02d-%02d', $year, $month, $day), 'rest' => $rest];
    }

    // ─── Exam topics ─────────────────────────────────────────────

    /**
     * Links to exam topics that belong to the subject: the nearest enclosing
     * block that names a subject must name this one, and a semester heading
     * above the link (e.g. "Výuka v ZS 2025") must be the subject's semester.
     *
     * @return list<array{text: string, url: string}>
     */
    private function topicLinks(DOMXPath $xpath, string $pageUrl, Subject $subject): array
    {
        $window = SemesterWindow::fromSemester($subject->semester);
        $topics = [];

        foreach ($xpath->query('//a[@href]') as $link) {
            /** @var DOMElement $link */
            $text = $this->clean($link->textContent);
            if (! preg_match(self::TOPIC_TEXT, SyllabusClassifier::normalize($text))) {
                continue;
            }
            $url = $this->absoluteUrl($pageUrl, $link->getAttribute('href'));
            if ($url === null || isset($topics[$url])) {
                continue;
            }
            if (! $this->isCurrentSemester($xpath, $link, $window) || ! $this->belongsToSubject($link, $subject)) {
                continue;
            }
            $topics[$url] = ['text' => mb_substr($text, 0, 255), 'url' => $url];
        }

        return array_values($topics);
    }

    private function isCurrentSemester(DOMXPath $xpath, DOMElement $link, SemesterWindow $window): bool
    {
        $heading = $xpath->query('preceding::*[self::h1 or self::h2 or self::h3 or self::h4][1]', $link)->item(0);
        if (! $heading || ! $window->isKnown()) {
            return true;
        }
        $text = SyllabusClassifier::normalize($heading->textContent);
        if (! preg_match('/\b(zs|ls)\s*(\d{4})\b/', $text, $m)) {
            return true;
        }

        return "{$m[1]} {$m[2]}" === $window->marker();
    }

    private function belongsToSubject(DOMElement $link, Subject $subject): bool
    {
        $code = SyllabusClassifier::normalize($subject->code);
        $name = SyllabusClassifier::normalize($subject->name);

        for ($node = $link->parentNode; $node instanceof DOMElement; $node = $node->parentNode) {
            $text = SyllabusClassifier::normalize($node->textContent);
            $mentionsThis = ($code !== '' && preg_match('/\b' . preg_quote($code, '/') . '\b/', $text))
                || ($name !== '' && str_contains($text, $name));
            if ($mentionsThis) {
                return true;
            }
            if (preg_match(self::COURSE_CODE, $text)) {
                return false; // the nearest block naming a subject names another one
            }
        }

        return false;
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function absoluteUrl(string $pageUrl, string $href): ?string
    {
        $href = trim($href);
        if ($href === '' || str_starts_with($href, '#') || preg_match('/^(mailto|tel|javascript|data):/i', $href)) {
            return null;
        }
        $url = UrlResolver::resolve($pageUrl, $href);
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return in_array($scheme, ['http', 'https'], true) && strlen($url) <= 2000 ? $url : null;
    }

    /** @param list<array{text: string, url: string}> $links */
    private function uniqueLinks(array $links): array
    {
        $unique = [];
        foreach ($links as $link) {
            $unique[$link['url']] ??= $link;
        }

        return $unique;
    }

    private function clean(?string $text): string
    {
        $text = html_entity_decode((string) $text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace("\u{00A0}", ' ', $text);
        $lines = array_map(fn ($line) => trim(preg_replace('/[ \t]+/u', ' ', $line)), preg_split('/\R/u', $text));

        return trim(implode("\n", array_filter($lines, fn ($line) => $line !== '')));
    }
}
