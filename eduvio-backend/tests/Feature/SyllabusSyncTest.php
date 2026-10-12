<?php

namespace Tests\Feature;

use App\Jobs\DepartmentLinksSyncJob;
use App\Models\Material;
use App\Models\Requirement;
use App\Models\Subject;
use App\Models\SyllabusItem;
use App\Models\User;
use App\Services\Department\SyllabusClassifier;
use App\Services\Department\SyllabusParser;
use App\Services\Department\SyllabusSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Semester schedule and exam topics from teachers' course pages
 * (fixtures: shortened copies of real pages, see tests/Fixtures/syllabus).
 */
class SyllabusSyncTest extends TestCase
{
    use RefreshDatabase;

    private const ZPP1_URL = 'https://jakubjuracka.cz/teaching/2026-2027-ZS/ZPP1';
    private const ZPP1_CHUNK = 'https://jakubjuracka.cz/_next/static/chunks/app/teaching/%5B...path%5D/page-fecd990e3ac017b1.js';
    private const ZPP1_ACTION = '60277d62bf4c67591bc5e88383cd67eb91a981495e';
    private const STATIC_URL = 'https://www.inf.upol.cz/lide/ucitel/vyuka/zpp1';

    private User $user;
    private ?string $staticHtml = null;
    private ?int $actionStatus = null;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'departments.min_request_interval_ms' => 0,
            'departments.allowed' => [], // no course-page discovery, only the links below
        ]);
        $this->user = User::factory()->create();
    }

    private function fixture(string $name): string
    {
        return file_get_contents(base_path("tests/Fixtures/syllabus/{$name}"));
    }

    private function subject(string $code, string $name, string $semester = 'ZS 2026'): Subject
    {
        return Subject::create([
            'user_id'    => $this->user->id,
            'code'       => $code,
            'name'       => $name,
            'credits'    => 5,
            'lecturer'   => 'Učitel',
            'department' => 'KMI',
            'semester'   => $semester,
        ]);
    }

    private function link(Subject $subject, string $url): Material
    {
        return Material::create([
            'user_id'     => $this->user->id,
            'subject_id'  => $subject->id,
            'url'         => $url,
            'type'        => 'LINK',
            'category'    => 'platform',
            'link_source' => 'auto',
            'size'        => 'External Link',
        ]);
    }

    /** ZPP1: the Next.js page, its chunk and the server action; later calls change the action status. */
    private function fakeZpp1(int $actionStatus = 200): void
    {
        $first = $this->actionStatus === null;
        $this->actionStatus = $actionStatus;
        if (! $first) {
            return;
        }
        Http::fake(function (HttpRequest $request) {
            $actionStatus = $this->actionStatus;
            if (str_ends_with($request->url(), '/robots.txt')) {
                return Http::response('', 404);
            }
            if ($request->method() === 'POST' && $request->url() === self::ZPP1_URL) {
                return $actionStatus === 200
                    ? Http::response($this->fixture('zpp1-action.txt'), 200, ['Content-Type' => 'text/x-component'])
                    : Http::response('<html>error</html>', $actionStatus, ['Content-Type' => 'text/html']);
            }
            if ($request->url() === self::ZPP1_URL) {
                return Http::response($this->fixture('zpp1-page.html'), 200, ['Content-Type' => 'text/html; charset=utf-8']);
            }
            if ($request->url() === self::ZPP1_CHUNK) {
                return Http::response($this->fixture('zpp1-page-chunk.js'), 200, ['Content-Type' => 'application/javascript']);
            }

            return Http::response('', 404);
        });
    }

    /** Serves $html as the static course page; later calls change the page. */
    private function fakeStaticPage(string $html): void
    {
        $first = $this->staticHtml === null;
        $this->staticHtml = $html;
        if (! $first) {
            return; // the fake registered first answers, it reads the current page
        }
        Http::fake(function (HttpRequest $request) {
            if ($request->url() === self::STATIC_URL) {
                return Http::response($this->staticHtml, 200, ['Content-Type' => 'text/html; charset=utf-8']);
            }

            return Http::response('', 404);
        });
    }

    private function sync(Material $link, array $hosts = ['jakubjuracka.cz']): ?array
    {
        return app(SyllabusSync::class)->syncLink($link, $hosts);
    }

    // ── Parsing ──────────────────────────────────────────────────

    public function test_zpp1_schedule_is_read_through_the_server_action(): void
    {
        $this->fakeZpp1();
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');

        $this->assertSame([], $this->sync($this->link($subject, self::ZPP1_URL)));

        $items = SyllabusItem::orderBy('date')->get();
        $this->assertCount(13, $items);
        $this->assertSame('2026-09-23', $items->first()->date->format('Y-m-d'));
        $this->assertSame(6, $items->where('assessment_type', 'test')->count());

        $credit = $items->firstWhere('assessment_type', 'credit_test');
        $this->assertSame('2026-12-09', $credit->date->format('Y-m-d'));
        $this->assertSame('ZÁPOČTOVÁ PÍSEMKA', $credit->title);
        $this->assertSame('2026-12-16', $items->firstWhere('assessment_type', 'retake')->date->format('Y-m-d'));
        $this->assertSame('2026-10-28', $items->firstWhere('kind', 'holiday')->date->format('Y-m-d'));
        $this->assertSame(4, $items->where('kind', 'session')->count());

        $first = $items->firstWhere('date', Carbon::parse('2026-10-07'));
        $this->assertStringStartsWith('1. PÍSEMNÁ PRÁCE', $first->title);
        $this->assertStringStartsWith('Krátká písemná práce', $first->description);
        $this->assertSame([['text' => 'ZPP1 - Seminář 3', 'url' => 'https://jakubjuracka.cz/api/files/download/ZPP1~seminar~3']], $first->links);

        Http::assertSent(fn (HttpRequest $r) => $r->method() === 'POST'
            && $r->hasHeader('Next-Action', self::ZPP1_ACTION)
            && $r->body() === '["2026-2027-ZS","ZPP1"]');
    }

    public function test_static_schedule_is_parsed_with_years_links_and_topics(): void
    {
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');
        $result = app(SyllabusParser::class)->parse($this->fixture('schedule-static.html'), self::STATIC_URL, $subject);

        $this->assertSame(
            ['2026-09-23', '2026-09-30', '2026-10-07', '2026-10-14', '2026-10-28', '2026-12-09', '2026-12-16'],
            array_column($result['items'], 'date')
        );
        $byDate = collect($result['items'])->keyBy('date');
        $this->assertSame('session', $byDate['2026-09-23']['kind']);
        $this->assertSame('test', $byDate['2026-10-14']['assessment_type']); // "14. 10." without a year
        $this->assertSame('holiday', $byDate['2026-10-28']['kind']);
        $this->assertSame('credit_test', $byDate['2026-12-09']['assessment_type']);
        $this->assertSame('retake', $byDate['2026-12-16']['assessment_type']);
        $this->assertSame('ZÁPOČTOVÁ PÍSEMKA', $byDate['2026-12-09']['title']);
        // A line with only a link adds the link, not its text, to the description
        $this->assertSame('Krátká písemná práce z probraného učiva. Větvení pomocí if, else a elif.', $byDate['2026-10-07']['description']);
        $this->assertSame('https://www.inf.upol.cz/api/files/download/ZPP1~seminar~3', $byDate['2026-10-07']['links'][0]['url']);

        $this->assertSame([['text' => 'okruhy ke zkoušce (PDF)', 'url' => 'https://www.inf.upol.cz/lide/ucitel/vyuka/okruhy-zpp1.pdf']], $result['topics']);
    }

    public function test_pages_without_a_schedule_give_nothing(): void
    {
        $parser = app(SyllabusParser::class);

        // Dated lecture slides from 2020 on an old course page are not this semester's schedule
        $strup = $parser->parse($this->fixture('outrata-strup.html'), 'http://outrata.inf.upol.cz/courses/strup/', $this->subject('STRUP', 'Struktura počítačů'));
        $this->assertSame([], $strup['items']);

        $udisk = $parser->parse($this->fixture('holcman-udisk.html'), 'https://www.inf.upol.cz/lide/jan-holcman/vyuka/uvod-do-diskretnich-struktur', $this->subject('UDISK', 'Úvod do diskrétních struktur'));
        $this->assertSame(['items' => [], 'topics' => []], $udisk);

        // Two dated rows are not a schedule
        $twoRows = '<p>7. 10. 2026 Písemka</p><p>14. 10. 2026 Přednáška</p>';
        $this->assertSame([], $parser->parse($twoRows, self::STATIC_URL, $this->subject('X', 'X'))['items']);
    }

    public function test_exam_topics_on_a_personal_page_belong_to_the_subject_and_semester(): void
    {
        $parser = app(SyllabusParser::class);
        $url = 'https://phoenix.inf.upol.cz/~kolarikm/';

        $udisk = $parser->parse($this->fixture('kolarikm.html'), $url, $this->subject('UDISK', 'Úvod do diskrétních struktur'));
        $this->assertSame(['https://phoenix.inf.upol.cz/~kolarikm/XDS1/Zk_okruhy_UDISK_a_XDS1_ZS_2026.pdf'], array_column($udisk['topics'], 'url'));

        $ma1 = $parser->parse($this->fixture('kolarikm.html'), $url, $this->subject('MA1', 'Matematická analýza 1'));
        $this->assertSame(['https://phoenix.inf.upol.cz/~kolarikm/MATA1/otazkyMA1.pdf'], array_column($ma1['topics'], 'url'));

        $other = $parser->parse($this->fixture('kolarikm.html'), $url, $this->subject('ZPP1', 'Základy programování pro IT 1'));
        $this->assertSame([], $other['topics']);
    }

    public function test_classification_keywords(): void
    {
        $cases = [
            '3. PÍSEMNÁ PRÁCE (20 min) + CYKLY' => ['assessment', 'test'],
            'Kvíz z rekurze'                    => ['assessment', 'test'],
            'Zápočtový test'                    => ['assessment', 'credit_test'],
            'Opravný termín zápočtové písemky'  => ['assessment', 'retake'],
            'Zkouška – předtermín'              => ['assessment', 'exam'],
            'Termín odevzdání úkolu 2'          => ['assessment', 'deadline'],
            'Obhajoba projektu'                 => ['assessment', 'project'],
            'Projektové řízení'                 => ['session', null],
            'Testování softwaru'                => ['session', null],
            'Děkanské volno'                    => ['holiday', null],
        ];
        foreach ($cases as $title => $expected) {
            $this->assertSame($expected, SyllabusClassifier::classify($title), $title);
        }
    }

    // ── Storing ──────────────────────────────────────────────────

    public function test_resync_updates_without_duplicates_removes_vanished_and_keeps_hidden_rows(): void
    {
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');
        $link = $this->link($subject, self::STATIC_URL);
        $sync = app(SyllabusSync::class);
        $parser = app(SyllabusParser::class);
        $items = $parser->parse($this->fixture('schedule-static.html'), self::STATIC_URL, $subject)['items'];

        $sync->storeItems($link, $subject, $items);
        $sync->storeItems($link, $subject, $items);
        $this->assertSame(7, SyllabusItem::count());

        // The retake is hidden by the user, then both it and the holiday disappear from the page
        $retake = SyllabusItem::where('assessment_type', 'retake')->sole();
        $retake->update(['hidden_at' => now()]);
        $remaining = array_values(array_filter($items, fn ($i) => ! in_array($i['date'], ['2026-12-16', '2026-10-28'], true)));
        $sync->storeItems($link, $subject, $remaining);

        $this->assertSame(6, SyllabusItem::count());
        $this->assertNull(SyllabusItem::where('kind', 'holiday')->first());
        $this->assertNotNull($retake->fresh()->hidden_at);

        // A hidden row that is still on the page stays hidden
        $sync->storeItems($link, $subject, $items);
        $this->assertNotNull($retake->fresh()->hidden_at);
        $this->assertSame(7, SyllabusItem::count());
    }

    public function test_failed_server_action_keeps_the_stored_schedule(): void
    {
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');
        $link = $this->link($subject, self::ZPP1_URL);
        $this->fakeZpp1();
        $this->sync($link);
        $this->assertSame(13, SyllabusItem::count());

        // The site was redeployed and the cached response expired: the action answers with HTML
        \Illuminate\Support\Facades\Cache::flush();
        $this->fakeZpp1(500);
        $this->assertNull($this->sync($link));
        $this->assertSame(13, SyllabusItem::count());
    }

    public function test_job_stores_schedule_and_exam_topic_links(): void
    {
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');
        $this->link($subject, self::STATIC_URL);
        $this->fakeStaticPage($this->fixture('schedule-static.html'));

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertSame(7, SyllabusItem::where('subject_id', $subject->id)->count());
        $topic = Material::where('is_exam_topics', true)->sole();
        $this->assertSame('https://www.inf.upol.cz/lide/ucitel/vyuka/okruhy-zpp1.pdf', $topic->url);
        $this->assertSame('auto', $topic->link_source);
        $this->assertSame('file', $topic->category);

        // The link disappears from the page: the automatic topic link goes too
        \Illuminate\Support\Facades\Cache::flush();
        $this->fakeStaticPage(str_replace('<a href="okruhy-zpp1.pdf">okruhy ke zkoušce (PDF)</a>', '', $this->fixture('schedule-static.html')));
        DepartmentLinksSyncJob::dispatchSync($this->user);
        $this->assertSame(0, Material::where('is_exam_topics', true)->count());
    }

    // ── API ──────────────────────────────────────────────────────

    private function storeStatic(Subject $subject): void
    {
        $link = $this->link($subject, self::STATIC_URL);
        $items = app(SyllabusParser::class)->parse($this->fixture('schedule-static.html'), self::STATIC_URL, $subject)['items'];
        app(SyllabusSync::class)->storeItems($link, $subject, $items);
    }

    public function test_api_lists_hides_and_unhides_rows(): void
    {
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');
        $this->storeStatic($subject);
        Sanctum::actingAs($this->user, ['*']);

        $rows = $this->getJson("/api/subjects/{$subject->id}/syllabus")->assertOk()->assertJsonCount(7)->json();
        $this->assertSame(self::STATIC_URL, $rows[0]['source_url']);
        $this->assertArrayNotHasKey('source_hash', $rows[0]);

        $id = collect($rows)->firstWhere('assessment_type', 'credit_test')['id'];
        $this->postJson("/api/syllabus-items/{$id}/hide")->assertOk()->assertJsonPath('hidden', true);
        $this->getJson("/api/subjects/{$subject->id}/syllabus")->assertJsonCount(6);
        $withHidden = $this->getJson("/api/subjects/{$subject->id}/syllabus?with_hidden=1")->assertJsonCount(7)->json();
        $this->assertTrue(collect($withHidden)->firstWhere('id', $id)['hidden']);
        $this->postJson("/api/syllabus-items/{$id}/unhide")->assertOk()->assertJsonPath('hidden', false);

        Sanctum::actingAs(User::factory()->create(), ['*']);
        $this->getJson("/api/subjects/{$subject->id}/syllabus")->assertNotFound();
        $this->postJson("/api/syllabus-items/{$id}/hide")->assertNotFound();
    }

    public function test_assessments_for_calendar_and_dashboard_skip_requirement_duplicates(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-05 10:00', 'Europe/Prague'));
        $subject = $this->subject('ZPP1', 'Základy programování pro IT 1');
        $this->storeStatic($subject);
        // The 14. 10. test already exists as a requirement (e.g. from Moodle)
        Requirement::create(['subject_id' => $subject->id, 'type' => 'test', 'title' => 'Test 2', 'due_date' => '2026-10-14', 'completed' => false]);
        Sanctum::actingAs($this->user, ['*']);

        $assessments = $this->getJson('/api/syllabus/assessments')->assertOk()->json();
        $this->assertSame(['2026-10-07', '2026-12-09', '2026-12-16'], array_column($assessments, 'date'));
        $this->assertSame('web', $assessments[0]['source']);
        $this->assertSame('test', $assessments[0]['type']);
        $this->assertSame($subject->id, $assessments[0]['subjectId']);

        $attention = collect($this->getJson('/api/dashboard/summary')->assertOk()->json('needsAttention'))
            ->where('type', 'assessment')->values();
        $this->assertCount(1, $attention); // only the test within 7 days
        $this->assertSame('2026-10-07', $attention[0]['dueDate']);
        $this->assertSame(2, $attention[0]['days']);
        $this->assertSame('ZPP1', $attention[0]['subjectCode']);

        Carbon::setTestNow();
    }
}
