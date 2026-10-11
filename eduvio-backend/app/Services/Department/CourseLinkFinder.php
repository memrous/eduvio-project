<?php

namespace App\Services\Department;

use App\Models\Subject;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Finds course pages of a subject on the department website: the staff list
 * leads to each teacher's profile, whose "Výuka" page links the courses
 * ("KMI/UNIXS Unixové systémy"); the personal "Web" page is the fallback.
 */
class CourseLinkFinder
{
    /** @var array<string, array<string, string>> base URL => normalized name => profile URL */
    private array $peopleByBase = [];

    /** @var array<string, array{web: ?string, teaching: ?string}> */
    private array $profiles = [];

    public function __construct(private InfUpolClient $client)
    {
    }

    /**
     * @return array{
     *     candidates: list<array{url: string, person: string, surname: string, role: string}>,
     *     complete: bool
     * }  complete is false when some page could not be fetched
     *
     * @throws DepartmentFetchException when the staff list is unavailable
     */
    public function find(Subject $subject, string $baseUrl): array
    {
        $people = $this->people($baseUrl);
        $pattern = $this->codePattern((string) $subject->department, (string) $subject->code);

        $candidates = [];
        $complete = true;

        foreach (self::subjectPeopleWithRoles($subject) as ['name' => $name, 'role' => $role]) {
            $profileUrl = $people[PersonNames::normalize($name)] ?? null;
            if ($profileUrl === null) {
                continue;
            }

            try {
                foreach ($this->findForPerson($profileUrl, $pattern) as $url) {
                    $candidates[$url] ??= [
                        'url'     => $url,
                        'person'  => PersonNames::displayName($name),
                        'surname' => PersonNames::surname($name),
                        'role'    => $role,
                    ];
                }
            } catch (DepartmentFetchException $e) {
                $complete = false;
                Log::warning('Department link lookup failed', [
                    'subject' => $subject->department . '/' . $subject->code,
                    'profile' => $profileUrl,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        return ['candidates' => array_values($candidates), 'complete' => $complete];
    }

    /**
     * Staff list: normalized name => profile URL (slugs are taken from the list).
     *
     * @return array<string, string>
     */
    public function people(string $baseUrl): array
    {
        $baseUrl = rtrim($baseUrl, '/');
        if (isset($this->peopleByBase[$baseUrl])) {
            return $this->peopleByBase[$baseUrl];
        }

        $page = $this->client->get($baseUrl . '/lide');
        if ($page === null) {
            throw new DepartmentFetchException("Staff list not available at {$baseUrl}/lide");
        }

        $xpath = $this->xpath($page['body']);
        $profilePattern = '#^' . preg_quote($baseUrl . '/lide/', '#') . '[^/?\#]+/?$#i';

        $people = [];
        foreach ($xpath->query('//a[@href][.//h1 or .//h2 or .//h3 or .//h4]') as $link) {
            $url = UrlResolver::resolve($page['url'], $link->getAttribute('href'));
            // Same person may be listed twice (management + teachers)
            if (preg_match($profilePattern, $this->normalizeScheme($url, $baseUrl))) {
                $key = PersonNames::normalize($this->text($link));
                if ($key !== '') {
                    $people[$key] ??= rtrim($url, '/');
                }
            }
        }

        return $this->peopleByBase[$baseUrl] = $people;
    }

    /**
     * Guarantor first, then lecturers and tutors, each person once.
     *
     * @return list<string>
     */
    public function subjectPeople(Subject $subject): array
    {
        return array_column(self::subjectPeopleWithRoles($subject), 'name');
    }

    /**
     * People of the subject with the role they are listed under first
     * ('guarantor', 'lecturer' or 'tutor').
     *
     * @return list<array{name: string, role: string}>
     */
    public static function subjectPeopleWithRoles(Subject $subject): array
    {
        $people = [];
        $lists = ['guarantor' => $subject->guarantor, 'lecturer' => $subject->lecturers, 'tutor' => $subject->tutors];
        foreach ($lists as $role => $list) {
            foreach (PersonNames::split($list) as $name) {
                $people[PersonNames::normalize($name)] ??= ['name' => $name, 'role' => $role];
            }
        }

        return array_values($people);
    }

    /**
     * @return list<string>
     */
    private function findForPerson(string $profileUrl, string $pattern): array
    {
        $profile = $this->profile($profileUrl);

        // a) Teaching page: links whose text contains the subject code
        if ($profile['teaching'] !== null) {
            $page = $this->client->get($profile['teaching']);
            if ($page !== null) {
                $urls = [];
                foreach ($this->xpath($page['body'])->query('//a[@href]') as $link) {
                    if (preg_match($pattern, $this->text($link))) {
                        $url = UrlResolver::resolve($page['url'], $link->getAttribute('href'));
                        if ($this->isHttpUrl($url)) {
                            $urls[] = $url;
                        }
                    }
                }
                if ($urls !== []) {
                    return array_values(array_unique($urls));
                }
            }
        }

        // b) Personal page mentioning the code, anchored at the nearest heading
        if ($profile['web'] !== null) {
            $page = $this->client->get($profile['web']);
            if ($page !== null) {
                $anchor = $this->findCodeAnchor($page['body'], $pattern);
                if ($anchor !== false) {
                    return [$profile['web'] . ($anchor !== null ? '#' . rawurlencode($anchor) : '')];
                }
            }
        }

        return [];
    }

    /**
     * Profile table: columns "Web" (personal page) and "Výuka" (teaching page).
     *
     * @return array{web: ?string, teaching: ?string}
     */
    private function profile(string $profileUrl): array
    {
        if (isset($this->profiles[$profileUrl])) {
            return $this->profiles[$profileUrl];
        }

        $result = ['web' => null, 'teaching' => null];
        $page = $this->client->get($profileUrl);

        if ($page !== null) {
            $xpath = $this->xpath($page['body']);
            foreach ($xpath->query('//table//tr[th]') as $headerRow) {
                $columns = [];
                foreach ($xpath->query('./th', $headerRow) as $index => $th) {
                    $columns[strtolower(Str::ascii($this->text($th)))] = $index;
                }
                if (! isset($columns['web']) && ! isset($columns['vyuka'])) {
                    continue;
                }

                $dataRow = $xpath->query('following-sibling::tr[td][1]', $headerRow)->item(0);
                if (! $dataRow instanceof DOMElement) {
                    continue;
                }
                $cells = $xpath->query('./td', $dataRow);

                foreach (['web' => 'web', 'teaching' => 'vyuka'] as $key => $column) {
                    $cell = isset($columns[$column]) ? $cells->item($columns[$column]) : null;
                    $link = $cell ? $xpath->query('.//a[@href]', $cell)->item(0) : null;
                    if ($link instanceof DOMElement) {
                        $url = UrlResolver::resolve($page['url'], $link->getAttribute('href'));
                        $result[$key] = $this->isHttpUrl($url) ? $url : null;
                    }
                }
                break;
            }
        }

        return $this->profiles[$profileUrl] = $result;
    }

    /**
     * @return string|null|false  id of the nearest heading before the code,
     *         null when that heading has no id, false when the code is absent
     */
    private function findCodeAnchor(string $html, string $pattern): string|null|false
    {
        $xpath = $this->xpath($html);
        $body = $xpath->query('//body')->item(0) ?? $xpath->document->documentElement;
        if ($body === null || ! preg_match($pattern, $this->text($body))) {
            return false;
        }

        $heading = null;
        $nodes = $xpath->query(
            '//h1 | //h2 | //h3 | //h4 | //h5 | //h6 | //body//text()[not(ancestor::script) and not(ancestor::style)]'
        );
        foreach ($nodes as $node) {
            if ($node instanceof DOMElement) {
                $heading = $node;
            } elseif (preg_match($pattern, $node->textContent)) {
                return $this->headingId($heading);
            }
        }

        // Code split across elements: link the page itself
        return null;
    }

    private function headingId(?DOMElement $heading): ?string
    {
        if ($heading === null) {
            return null;
        }
        if ($heading->getAttribute('id') !== '') {
            return $heading->getAttribute('id');
        }
        foreach ($heading->getElementsByTagName('*') as $child) {
            if ($child->getAttribute('id') !== '') {
                return $child->getAttribute('id');
            }
        }

        return null;
    }

    /** Whole code, case-insensitive: "KMI/MA1" does not match "KMI/MA12". */
    private function codePattern(string $department, string $code): string
    {
        return '#(?<![A-Z0-9])' . preg_quote(strtoupper(trim($department)) . '/' . strtoupper(trim($code)), '#') . '(?![A-Z0-9])#i';
    }

    private function xpath(string $html): DOMXPath
    {
        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return new DOMXPath($document);
    }

    private function text(DOMNode $node): string
    {
        return trim(preg_replace('/\s+/u', ' ', $node->textContent));
    }

    private function isHttpUrl(string $url): bool
    {
        return in_array(strtolower((string) parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true);
    }

    /** Staff list links may use http:// while the base URL is https:// (or vice versa). */
    private function normalizeScheme(string $url, string $baseUrl): string
    {
        $baseScheme = parse_url($baseUrl, PHP_URL_SCHEME);

        return preg_replace('#^https?://#i', $baseScheme . '://', $url);
    }
}
