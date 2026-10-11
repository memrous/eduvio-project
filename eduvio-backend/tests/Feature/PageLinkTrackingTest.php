<?php

namespace Tests\Feature;

use App\Jobs\DepartmentLinksSyncJob;
use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PageLinkTrackingTest extends TestCase
{
    use RefreshDatabase;

    private const PAGE = 'http://outrata.inf.upol.cz/courses/unixs/';
    private const DIR = 'http://outrata.inf.upol.cz/courses/unixs/';
    private const FILES = 'https://soubor.inf.upol.cz/ws-public/Lide/Outrata/UNIXS/';

    private User $user;
    private Subject $subject;

    /** HTML served for the course page in the current run. */
    private string $pageHtml;

    protected function setUp(): void
    {
        parent::setUp();

        config(['departments.min_request_interval_ms' => 0]);

        $this->user = User::create([
            'name'     => 'John Doe',
            'username' => 'johndoe',
            'email'    => 'john@example.com',
            'password' => 'password123',
        ]);
        $this->subject = Subject::create([
            'user_id'    => $this->user->id,
            'code'       => 'MR',
            'name'       => 'Subject MR',
            'credits'    => 5,
            'lecturer'   => 'Dr. Smith',
            'department' => 'KAG', // no department lookup, only page checks
            'semester'   => 'ZS 2026',
        ]);

        $this->pageHtml = $this->fixture('course-unixs-v1.html');
        Http::fake([
            '*/robots.txt' => Http::response('Not Found', 404),
            // Empty HTML simulates a server error
            self::PAGE     => fn () => $this->pageHtml === ''
                ? Http::response('Server Error', 500)
                : Http::response($this->pageHtml, 200, ['Content-Type' => 'text/html; charset=UTF-8']),
            '*'            => Http::response('<a href="new.pdf">new</a>', 200, ['Content-Type' => 'text/html']),
        ]);
    }

    private function fixture(string $name): string
    {
        return file_get_contents(base_path("tests/Fixtures/inf-upol/{$name}"));
    }

    private function createLink(string $url, string $source = 'manual'): Material
    {
        return Material::create([
            'user_id'     => $this->user->id,
            'subject_id'  => $this->subject->id,
            'title'       => 'Stránka předmětu',
            'type'        => 'LINK',
            'url'         => $url,
            'category'    => 'platform',
            'link_source' => $source,
        ]);
    }

    /** Run the job as on another day: the page cache has expired. */
    private function runJob(string $pageHtml): void
    {
        $this->pageHtml = $pageHtml;
        Cache::flush();
        DepartmentLinksSyncJob::dispatchSync($this->user);
    }

    private function urls(?array $links): array
    {
        return array_column($links ?? [], 'url');
    }

    public function test_first_run_only_remembers_the_page(): void
    {
        $link = $this->createLink(self::PAGE, 'auto');

        $this->runJob($this->fixture('course-unixs-v1.html'));

        $link->refresh();
        // Navigation, footer, mailto, same-page anchors and unrelated pages are left out
        $this->assertEqualsCanonicalizing([
            self::DIR . 'unix-linux.pdf',
            self::DIR . 'practices.html',
            self::FILES . 'UNIXS-prednaska-2020-10-19.mp4',
            self::FILES . 'UNIXS-prednaska-2020-11-02.mp4',
        ], $this->urls($link->page_links));
        $this->assertNull($link->page_links_new);
        $this->assertNull($link->content_changed_at);
    }

    public function test_new_links_are_reported_and_removed_ones_are_not(): void
    {
        $link = $this->createLink(self::PAGE, 'auto');
        $this->runJob($this->fixture('course-unixs-v1.html'));

        $this->runJob($this->fixture('course-unixs-v2.html'));

        $link->refresh();
        $this->assertEqualsCanonicalizing([
            self::DIR . 'zkouska-ukazka-2026.pdf',
            self::FILES . 'UNIXS-prednaska-2026-10-07.mp4',
        ], $this->urls($link->page_links_new));
        $this->assertSame('ukázkové zadání zkoušky', collect($link->page_links_new)->firstWhere('url', self::DIR . 'zkouska-ukazka-2026.pdf')['text']);
        $this->assertNotNull($link->content_changed_at);
        // The removed recording is gone from the snapshot and never reported
        $this->assertNotContains(self::FILES . 'UNIXS-prednaska-2020-10-19.mp4', $this->urls($link->page_links));
    }

    public function test_unseen_new_link_removed_from_page_is_no_longer_reported(): void
    {
        $link = $this->createLink(self::PAGE, 'auto');
        $this->runJob($this->fixture('course-unixs-v1.html'));
        $this->runJob($this->fixture('course-unixs-v2.html'));

        $withoutExam = str_replace('<li><a href="zkouska-ukazka-2026.pdf">ukázkové zadání zkoušky</a></li>', '', $this->fixture('course-unixs-v2.html'));
        $this->runJob($withoutExam);

        $this->assertSame(
            [self::FILES . 'UNIXS-prednaska-2026-10-07.mp4'],
            $this->urls($link->fresh()->page_links_new),
        );
    }

    public function test_unchanged_page_reports_nothing(): void
    {
        $link = $this->createLink(self::PAGE, 'auto');
        $this->runJob($this->fixture('course-unixs-v1.html'));

        $this->runJob($this->fixture('course-unixs-v1.html'));

        $this->assertNull($link->fresh()->page_links_new);
        $this->assertNull($link->fresh()->content_changed_at);
    }

    public function test_seen_clears_new_links_and_they_are_not_reported_again(): void
    {
        $link = $this->createLink(self::PAGE, 'auto');
        $this->runJob($this->fixture('course-unixs-v1.html'));
        $this->runJob($this->fixture('course-unixs-v2.html'));

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/materials/{$link->id}/seen")
            ->assertOk()
            ->assertJsonPath('page_links_new', null)
            ->assertJsonMissingPath('page_links');

        $link->refresh();
        $this->assertNull($link->page_links_new);
        $this->assertNotNull($link->seen_at);

        $this->runJob($this->fixture('course-unixs-v2.html'));
        $this->assertNull($link->fresh()->page_links_new);
    }

    public function test_seen_is_only_allowed_for_own_materials(): void
    {
        $link = $this->createLink(self::PAGE);
        $other = User::create(['name' => 'Eve', 'username' => 'eve', 'email' => 'eve@example.com', 'password' => 'password123']);

        $this->actingAs($other, 'sanctum')->postJson("/api/materials/{$link->id}/seen")->assertNotFound();
    }

    public function test_manual_links_are_checked_too(): void
    {
        $link = $this->createLink(self::PAGE, 'manual');

        $this->runJob($this->fixture('course-unixs-v1.html'));

        $this->assertCount(4, $link->fresh()->page_links);
    }

    public function test_only_configured_domains_and_hosts_of_auto_links_are_fetched(): void
    {
        $outside = $this->createLink('https://example.org/course');
        $this->createLink('https://jakubjuracka.cz/teaching/ZPP1', 'auto');
        $sameHost = $this->createLink('https://jakubjuracka.cz/teaching/other');

        $this->runJob($this->fixture('course-unixs-v1.html'));

        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'example.org'));
        $this->assertNull($outside->fresh()->page_links);
        $this->assertNotNull($sameHost->fresh()->page_links);
    }

    public function test_failed_page_keeps_previous_state(): void
    {
        $link = $this->createLink(self::PAGE, 'auto');
        $this->runJob($this->fixture('course-unixs-v1.html'));
        $before = $link->fresh()->page_links;

        $this->runJob('');

        $this->assertSame($before, $link->fresh()->page_links);
        $this->assertNull($link->fresh()->page_links_new);
    }
}
