<?php

namespace App\Services\Department;

use App\Models\Material;
use App\Models\Subject;
use App\Models\SyllabusItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Keeps the semester schedule (syllabus_items) and exam-topic links of a
 * subject in step with the teachers' course pages.
 */
class SyllabusSync
{
    public function __construct(
        private InfUpolClient $client,
        private SyllabusParser $parser,
        private NextTeachingSource $nextTeaching,
    ) {
    }

    /**
     * Parse one semester link and store its schedule.
     *
     * @return list<array{text: string, url: string}>|null  exam-topic links of the page,
     *         null when the page could not be read (nothing was changed)
     */
    public function syncLink(Material $link, array $extraHosts = []): ?array
    {
        $subject = $link->subject;
        $scheme = strtolower((string) parse_url((string) $link->url, PHP_URL_SCHEME));
        if (! $subject || ! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        try {
            $page = $this->client->get($link->url, $extraHosts);
            if ($page === null) {
                return null;
            }
            $result = $this->parsePage($page['body'], $page['url'], $subject, $extraHosts);
        } catch (DepartmentFetchException $e) {
            Log::warning("Syllabus check failed for material {$link->id}", ['error' => mb_substr($e->getMessage(), 0, 300)]);

            return null;
        }
        if ($result === null) {
            return null;
        }

        $this->storeItems($link, $subject, $result['items']);

        return $result['topics'];
    }

    /**
     * @return array{items: list<array>, topics: list<array>}|null
     *
     * @throws DepartmentFetchException
     */
    public function parsePage(string $html, string $pageUrl, Subject $subject, array $extraHosts = []): ?array
    {
        if (! $this->nextTeaching->supports($html, $pageUrl)) {
            return $this->parser->parse($html, $pageUrl, $subject);
        }

        $content = $this->nextTeaching->fetch($html, $pageUrl, $extraHosts);
        if ($content === null) {
            return null; // the action could not be found or called: keep what we have
        }
        // Text sections of a page for this subject may link exam topics
        $textPart = $this->parser->parse('<html><body><h1>' . e($subject->name) . '</h1>' . $content['html'] . '</body></html>', $pageUrl, $subject);

        return [
            'items'  => $this->parser->buildItems($content['blocks'], $subject),
            'topics' => $textPart['topics'],
        ];
    }

    /**
     * Upsert the page's rows by source_hash; rows that disappeared from the
     * page are removed unless the user hid them.
     */
    public function storeItems(Material $link, Subject $subject, array $items): void
    {
        DB::transaction(function () use ($link, $subject, $items) {
            $kept = [];
            foreach ($items as $item) {
                SyllabusItem::updateOrCreate(
                    ['user_id' => $subject->user_id, 'subject_id' => $subject->id, 'source_hash' => $item['source_hash']],
                    [
                        'resource_id'     => $link->id,
                        'date'            => $item['date'],
                        'title'           => $item['title'],
                        'description'     => $item['description'],
                        'links'           => $item['links'],
                        'kind'            => $item['kind'],
                        'assessment_type' => $item['assessment_type'],
                    ]
                );
                $kept[] = $item['source_hash'];
            }

            SyllabusItem::where('resource_id', $link->id)
                ->whereNull('hidden_at')
                ->whereNotIn('source_hash', $kept)
                ->delete();
        });
    }

    /**
     * Keep the subject's automatic exam-topic links equal to the links found
     * on its pages. Hidden ones stay hidden; a URL the subject already has as
     * another material is not added again.
     *
     * @param  list<array{text: string, url: string}>  $topics
     */
    public function syncTopics(Subject $subject, array $topics): void
    {
        $existing = Material::where('subject_id', $subject->id)->get();
        $autoTopics = $existing->filter(fn (Material $m) => $m->is_exam_topics && $m->link_source === 'auto');

        $urls = [];
        foreach ($topics as $topic) {
            if (strlen($topic['url']) > 255 || isset($urls[$topic['url']])) {
                continue;
            }
            $urls[$topic['url']] = true;

            $material = $autoTopics->first(fn (Material $m) => $m->url === $topic['url']);
            if ($material) {
                $material->update(['title' => $topic['text']]);
                continue;
            }
            if ($existing->contains(fn (Material $m) => $m->url === $topic['url'])) {
                continue;
            }
            Material::create([
                'user_id'        => $subject->user_id,
                'subject_id'     => $subject->id,
                'title'          => $topic['text'],
                'type'           => 'LINK',
                'url'            => $topic['url'],
                'category'       => 'file',
                'size'           => 'External Link',
                'link_source'    => 'auto',
                'is_exam_topics' => true,
            ]);
        }

        $autoTopics
            ->filter(fn (Material $m) => ! isset($urls[$m->url]) && $m->hidden_at === null)
            ->each(fn (Material $m) => $m->delete());
    }
}
