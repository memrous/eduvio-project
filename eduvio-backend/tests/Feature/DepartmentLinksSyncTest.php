<?php

namespace Tests\Feature;

use App\Jobs\DepartmentLinksSyncJob;
use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use App\Services\Department\CourseLinkFinder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DepartmentLinksSyncTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = 'https://www.inf.upol.cz';
    private const UNIXS_PAGE = 'http://outrata.inf.upol.cz/courses/unixs';
    private const KOLARIK_WEB = 'https://phoenix.inf.upol.cz/~kolarikm/';

    private User $user;

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
    }

    private function fixture(string $name): string
    {
        return file_get_contents(base_path("tests/Fixtures/inf-upol/{$name}"));
    }

    private function createSubject(string $code, array $overrides = []): Subject
    {
        return Subject::create(array_merge([
            'user_id'    => $this->user->id,
            'code'       => $code,
            'name'       => "Subject {$code}",
            'credits'    => 5,
            'lecturer'   => 'Dr. Smith',
            'department' => 'KMI',
            'semester'   => 'ZS 2026',
        ], $overrides));
    }

    /**
     * Fake the department website from the fixtures; $overrides replace or add URLs.
     */
    private function fakeSite(array $overrides = []): void
    {
        $html = fn (string $body, string $contentType = 'text/html; charset=UTF-8') =>
            Http::response($body, 200, ['Content-Type' => $contentType]);

        Http::fake(array_merge([
            self::BASE . '/robots.txt'                        => Http::response("User-agent: *\nDisallow: /scripts/\n", 200),
            'https://phoenix.inf.upol.cz/robots.txt'          => Http::response('Not Found', 404),
            'http://outrata.inf.upol.cz/robots.txt'           => Http::response('Not Found', 404),
            self::BASE . '/lide'                              => $html($this->fixture('lide.html')),
            self::BASE . '/lide/jan-outrata'                  => $html($this->fixture('profile-jan-outrata.html')),
            self::BASE . '/lide/jan-outrata/vyuka'            => $html($this->fixture('teaching-jan-outrata.html')),
            self::BASE . '/lide/miroslav-kolarik'             => $html($this->fixture('profile-miroslav-kolarik.html')),
            self::BASE . '/lide/miroslav-kolarik/vyuka'       => $html($this->fixture('teaching-miroslav-kolarik.html')),
            self::KOLARIK_WEB                                 => $html($this->fixture('personal-kolarikm.html'), 'text/html'),
        ], $overrides, [
            '*' => Http::response('Not Found', 404),
        ]));
    }

    private function platformLinks(): \Illuminate\Support\Collection
    {
        return Material::where('category', 'platform')->orderBy('id')->get();
    }

    private function requested(string $url): bool
    {
        return Http::recorded(fn (Request $request) => $request->url() === $url)->isNotEmpty();
    }

    // ─── Parsing ────────────────────────────────────────────────

    public function test_staff_list_maps_normalized_names_to_profiles(): void
    {
        $this->fakeSite();

        $people = app(CourseLinkFinder::class)->people(self::BASE);

        $this->assertSame([
            'eduard bartl'     => self::BASE . '/lide/eduard-bartl',
            'miroslav kolarik' => self::BASE . '/lide/miroslav-kolarik',
            'jan outrata'      => self::BASE . '/lide/jan-outrata',
            'petr osicka'      => self::BASE . '/lide/petr-osicka',
        ], $people);
    }

    public function test_subject_people_are_ordered_and_unique(): void
    {
        $subject = $this->createSubject('UNIXS', [
            'guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.',
            'lecturers' => 'Mgr. Petr Osička, Ph.D., doc. Mgr. Jan Outrata, Ph.D.',
            'tutors'    => 'Mgr. Tomáš Kühr, Ph.D., doc. Mgr. Jan Outrata, Ph.D.',
        ]);

        $this->assertSame(
            ['doc. Mgr. Jan Outrata, Ph.D.', 'Mgr. Petr Osička, Ph.D.', 'Mgr. Tomáš Kühr, Ph.D.'],
            app(CourseLinkFinder::class)->subjectPeople($subject),
        );
    }

    // ─── Finding links ──────────────────────────────────────────

    public function test_link_from_teaching_page_is_stored_as_auto_semester_material(): void
    {
        $this->fakeSite();
        $subject = $this->createSubject('UNIXS', [
            'guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.',
            'lecturers' => 'Mgr. Petr Osička, Ph.D., doc. Mgr. Jan Outrata, Ph.D.',
            'tutors'    => 'Mgr. Tomáš Kühr, Ph.D., MDDr. Karel Panchártek',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $links = $this->platformLinks();
        $this->assertCount(1, $links);
        $this->assertSame(self::UNIXS_PAGE, $links[0]->url);
        $this->assertSame($subject->id, $links[0]->subject_id);
        $this->assertSame($this->user->id, $links[0]->user_id);
        $this->assertSame('auto', $links[0]->link_source);
        $this->assertSame('LINK', $links[0]->type);
        $this->assertSame('Jan Outrata', $links[0]->source_person);
        $this->assertNull($links[0]->title);
        $this->assertSame('guarantor', $links[0]->source_role);
        $this->assertNotNull($links[0]->last_checked_at);
    }

    public function test_code_must_match_whole_and_case_insensitive(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/jan-outrata/vyuka' => Http::response(
                '<ul><li><a href="/x/unixs2">KMI/UNIXS2 Pokračování</a></li><li><a href="/x/unixs">kmi/unixs Unixové systémy</a></li></ul>',
                200,
                ['Content-Type' => 'text/html; charset=UTF-8'],
            ),
        ]);
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertSame([self::BASE . '/x/unixs'], $this->platformLinks()->pluck('url')->all());
    }

    public function test_personal_page_is_the_fallback_and_windows_1250_is_decoded(): void
    {
        $this->fakeSite();
        $this->createSubject('UDISK', [
            'guarantor' => 'prof. RNDr. Radim Bělohlávek, Ph.D., DSc.',
            'lecturers' => 'prof. RNDr. Radim Bělohlávek, Ph.D., DSc., doc. RNDr. Miroslav Kolařík, Ph.D.',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $links = $this->platformLinks();
        $this->assertCount(1, $links);
        // The "Výuka v ZS 2026" heading has no id, so the page itself is linked
        $this->assertSame(self::KOLARIK_WEB, $links[0]->url);
        $this->assertSame('Miroslav Kolařík', $links[0]->source_person);
        $this->assertNull($links[0]->title);
        // Kolařík is listed as lecturer; the guarantor has no profile in the staff list
        $this->assertSame('lecturer', $links[0]->source_role);
    }

    public function test_role_is_the_first_one_the_person_is_listed_under(): void
    {
        $this->fakeSite();
        $this->createSubject('UNIXS', [
            'guarantor' => 'prof. RNDr. Radim Bělohlávek, Ph.D., DSc.',
            'lecturers' => 'Mgr. Petr Osička, Ph.D.',
            'tutors'    => 'doc. Mgr. Jan Outrata, Ph.D., Mgr. Petr Osička, Ph.D.',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $link = $this->platformLinks()->firstWhere('url', self::UNIXS_PAGE);
        $this->assertSame('Jan Outrata', $link->source_person);
        $this->assertSame('tutor', $link->source_role);
    }

    public function test_auto_link_json_has_no_title_but_person_and_role(): void
    {
        $this->fakeSite();
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->actingAs($this->user, 'sanctum')->getJson('/api/materials')
            ->assertOk()
            ->assertJsonPath('0.title', null)
            ->assertJsonPath('0.link_source', 'auto')
            ->assertJsonPath('0.source_person', 'Jan Outrata')
            ->assertJsonPath('0.source_role', 'guarantor');
    }

    public function test_personal_page_link_is_anchored_at_nearest_heading_with_id(): void
    {
        $this->fakeSite([
            self::KOLARIK_WEB => Http::response(
                '<h2 id="konzultace">Konzultace</h2><h2 id="vyuka-zs">Výuka v ZS</h2><ul><li><b>Matematická analýza 1</b> (KMI/MA1)</li></ul>',
                200,
                ['Content-Type' => 'text/html; charset=UTF-8'],
            ),
        ]);
        $this->createSubject('MA1', ['guarantor' => 'doc. RNDr. Miroslav Kolařík, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertSame([self::KOLARIK_WEB . '#vyuka-zs'], $this->platformLinks()->pluck('url')->all());
    }

    public function test_same_page_found_via_several_people_is_stored_once(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/petr-osicka'       => Http::response($this->fixture('profile-jan-outrata.html')),
            self::BASE . '/lide/jan-outrata/vyuka' => Http::response(
                '<a href="http://outrata.inf.upol.cz/courses/unixs">KMI/UNIXS Unixové systémy</a>'
            ),
        ]);
        $this->createSubject('UNIXS', [
            'guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.',
            'lecturers' => 'Mgr. Petr Osička, Ph.D.',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        // Osička's (faked) profile leads to the same page → no duplicate
        $this->assertSame([self::UNIXS_PAGE], $this->platformLinks()->pluck('url')->all());
    }

    // ─── Manual vs. automatic links ─────────────────────────────

    public function test_manual_link_is_never_overwritten_and_blocks_duplicate_auto_link(): void
    {
        $this->fakeSite();
        $subject = $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        $manual = Material::create([
            'user_id'     => $this->user->id,
            'subject_id'  => $subject->id,
            'title'       => 'Můj odkaz',
            'type'        => 'LINK',
            'url'         => self::UNIXS_PAGE,
            'category'    => 'platform',
            'link_source' => 'manual',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $links = $this->platformLinks();
        $this->assertCount(1, $links);
        $this->assertSame($manual->id, $links[0]->id);
        $this->assertSame('Můj odkaz', $links[0]->title);
        $this->assertSame('manual', $links[0]->link_source);
    }

    public function test_vanished_auto_link_is_deleted_but_manual_one_stays(): void
    {
        $this->fakeSite();
        $subject = $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        $base = ['user_id' => $this->user->id, 'subject_id' => $subject->id, 'type' => 'LINK', 'category' => 'platform'];
        $stale = Material::create($base + ['title' => 'Stará stránka', 'url' => 'http://outrata.inf.upol.cz/old', 'link_source' => 'auto']);
        $manual = Material::create($base + ['title' => 'Ruční', 'url' => 'https://example.org/unixs', 'link_source' => 'manual']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertModelMissing($stale);
        $this->assertModelExists($manual);
        $this->assertEqualsCanonicalizing(
            [self::UNIXS_PAGE, 'https://example.org/unixs'],
            $this->platformLinks()->pluck('url')->all(),
        );
    }

    public function test_auto_link_is_kept_when_a_page_fails(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/jan-outrata/vyuka' => Http::response('Server Error', 500),
        ]);
        $subject = $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        $existing = Material::create([
            'user_id'     => $this->user->id,
            'subject_id'  => $subject->id,
            'title'       => 'Stránka předmětu – Outrata',
            'type'        => 'LINK',
            'url'         => self::UNIXS_PAGE,
            'category'    => 'platform',
            'link_source' => 'auto',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertModelExists($existing);
    }

    public function test_failure_of_one_subject_does_not_stop_others(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/miroslav-kolarik' => Http::response('Server Error', 500),
        ]);
        $this->createSubject('UDISK', ['guarantor' => 'doc. RNDr. Miroslav Kolařík, Ph.D.']);
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertSame([self::UNIXS_PAGE], $this->platformLinks()->pluck('url')->all());
    }

    // ─── Scope and etiquette ────────────────────────────────────

    public function test_subjects_of_other_departments_are_skipped(): void
    {
        $this->fakeSite();
        $this->createSubject('MR', ['department' => 'KAG', 'guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertCount(0, $this->platformLinks());
        Http::assertNothingSent();
    }

    public function test_robots_txt_disallow_is_respected(): void
    {
        $this->fakeSite([
            self::BASE . '/robots.txt' => Http::response("User-agent: *\nDisallow: /lide/jan-outrata/vyuka\n", 200),
        ]);
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertFalse($this->requested(self::BASE . '/lide/jan-outrata/vyuka'));
        $this->assertCount(0, $this->platformLinks());
    }

    public function test_robots_txt_group_for_our_bot_wins_over_wildcard(): void
    {
        $this->fakeSite([
            self::BASE . '/robots.txt' => Http::response("User-agent: *\nDisallow:\n\nUser-agent: EduvioBot\nDisallow: /lide\n", 200),
        ]);
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertFalse($this->requested(self::BASE . '/lide'));
        $this->assertCount(0, $this->platformLinks());
    }

    public function test_requests_use_own_user_agent_and_redirects_are_followed(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/jan-outrata/vyuka' => Http::response('', 301, ['Location' => 'http://www.inf.upol.cz/lide/jan-outrata/vyuka/']),
            'http://www.inf.upol.cz/robots.txt'     => Http::response('', 301, ['Location' => self::BASE . '/robots.txt']),
            'http://www.inf.upol.cz/lide/jan-outrata/vyuka/' => Http::response($this->fixture('teaching-jan-outrata.html')),
        ]);
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertSame([self::UNIXS_PAGE], $this->platformLinks()->pluck('url')->all());
        Http::assertSent(fn (Request $request) => str_starts_with($request->header('User-Agent')[0] ?? '', 'EduvioBot/1.0 (+'));
    }

    public function test_redirect_loop_counts_as_failure(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/jan-outrata/vyuka' => Http::response('', 302, ['Location' => 'http://www.inf.upol.cz/lide/jan-outrata/vyuka']),
            'http://www.inf.upol.cz/robots.txt'     => Http::response('', 404),
            'http://www.inf.upol.cz/lide/jan-outrata/vyuka' => Http::response('', 302, ['Location' => self::BASE . '/lide/jan-outrata/vyuka']),
        ]);
        $subject = $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        $existing = Material::create([
            'user_id' => $this->user->id, 'subject_id' => $subject->id, 'title' => 'x', 'type' => 'LINK',
            'url' => self::UNIXS_PAGE, 'category' => 'platform', 'link_source' => 'auto',
        ]);

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertModelExists($existing);
    }

    public function test_pages_are_cached_between_runs(): void
    {
        $this->fakeSite();
        $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);

        DepartmentLinksSyncJob::dispatchSync($this->user);
        $first = count(Http::recorded());
        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertSame($first, count(Http::recorded()));
    }

    // ─── Triggers ───────────────────────────────────────────────

    public function test_successful_agent_report_dispatches_sync_for_kmi_subjects(): void
    {
        Queue::fake();
        $this->createSubject('UNIXS');
        $token = $this->user->createToken(User::STAG_AGENT_TOKEN, ['stag:sync'])->plainTextToken;

        $this->withToken($token)->postJson('/api/stag/agent/report', ['status' => 'success'])->assertOk();

        Queue::assertPushed(DepartmentLinksSyncJob::class, fn ($job) => $job->user->is($this->user));
    }

    public function test_agent_report_without_kmi_subjects_dispatches_nothing(): void
    {
        Queue::fake();
        $this->createSubject('MR', ['department' => 'KAG']);
        $token = $this->user->createToken(User::STAG_AGENT_TOKEN, ['stag:sync'])->plainTextToken;

        $this->withToken($token)->postJson('/api/stag/agent/report', ['status' => 'success'])->assertOk();

        Queue::assertNotPushed(DepartmentLinksSyncJob::class);
    }

    public function test_refresh_endpoint_dispatches_and_enforces_cooldown(): void
    {
        Queue::fake();
        $this->createSubject('UNIXS');
        $this->actingAs($this->user, 'sanctum');

        $this->postJson('/api/user/department-links/refresh')
            ->assertStatus(202)
            ->assertJsonPath('status', 'pending');
        Queue::assertPushed(DepartmentLinksSyncJob::class);

        $this->postJson('/api/user/department-links/refresh')->assertStatus(429);

        $this->travel(31)->minutes();
        // The queued job never ran in this test; mark it finished
        \Illuminate\Support\Facades\Cache::put(DepartmentLinksSyncJob::statusKey($this->user->id), ['status' => 'success', 'finished_at' => now()->toIso8601String()]);

        $this->postJson('/api/user/department-links/refresh')->assertStatus(202);
    }

    public function test_refresh_without_supported_subjects_is_rejected(): void
    {
        Queue::fake();
        $this->actingAs($this->user, 'sanctum');

        $this->postJson('/api/user/department-links/refresh')->assertStatus(422);
        $this->getJson('/api/user/department-links/status')
            ->assertOk()
            ->assertJsonPath('status', 'idle')
            ->assertJsonPath('supported', false);
        Queue::assertNothingPushed();
    }

    // ─── Manual links via MaterialController ────────────────────

    public function test_manual_platform_link_can_be_created_and_edited(): void
    {
        $subject = $this->createSubject('UNIXS');
        $this->actingAs($this->user, 'sanctum');

        $id = $this->postJson('/api/materials', [
            'subjectId' => $subject->id,
            'title'     => 'Stránka cvičení',
            'type'      => 'LINK',
            'url'       => 'https://example.org/unixs',
            'category'  => 'platform',
        ])->assertCreated()
            ->assertJsonPath('link_source', 'manual')
            ->json('id');

        $this->putJson("/api/materials/{$id}", ['title' => 'Cvičení UNIXS', 'url' => 'https://example.org/unixs/2026'])
            ->assertOk()
            ->assertJsonPath('title', 'Cvičení UNIXS')
            ->assertJsonPath('url', 'https://example.org/unixs/2026');
    }

    public function test_platform_link_url_must_be_http_or_https(): void
    {
        $subject = $this->createSubject('UNIXS');
        $this->actingAs($this->user, 'sanctum');

        foreach (['javascript:alert(1)', 'ftp://example.org/x', 'not a url'] as $url) {
            $this->postJson('/api/materials', [
                'subjectId' => $subject->id, 'title' => 'x', 'type' => 'LINK', 'url' => $url, 'category' => 'platform',
            ])->assertUnprocessable()->assertJsonValidationErrors('url');
        }
    }

    public function test_editing_auto_link_turns_it_manual_so_sync_keeps_it(): void
    {
        $this->fakeSite([
            self::BASE . '/lide/jan-outrata/vyuka' => Http::response('<p>Žádné předměty</p>'),
        ]);
        $subject = $this->createSubject('UNIXS', ['guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        $auto = Material::create([
            'user_id' => $this->user->id, 'subject_id' => $subject->id, 'title' => 'Stránka předmětu – Outrata',
            'type' => 'LINK', 'url' => self::UNIXS_PAGE, 'category' => 'platform', 'link_source' => 'auto',
            'source_person' => 'Jan Outrata',
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/materials/{$auto->id}", ['title' => 'UNIXS – materiály'])
            ->assertOk()
            ->assertJsonPath('link_source', 'manual');

        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertModelExists($auto);
        $this->assertSame('UNIXS – materiály', $auto->fresh()->title);
    }

    public function test_duplicate_manual_link_is_rejected_and_file_materials_cannot_be_edited(): void
    {
        $subject = $this->createSubject('UNIXS');
        $this->actingAs($this->user, 'sanctum');
        $payload = ['subjectId' => $subject->id, 'title' => 'x', 'type' => 'LINK', 'url' => 'https://example.org/a', 'category' => 'platform'];

        $this->postJson('/api/materials', $payload)->assertCreated();
        $this->postJson('/api/materials', $payload)->assertUnprocessable()->assertJsonValidationErrors('url');

        $file = Material::create(['subject_id' => $subject->id, 'title' => 'f', 'type' => 'PDF', 'url' => '/storage/f.pdf', 'category' => 'file']);
        $this->putJson("/api/materials/{$file->id}", ['title' => 'y'])->assertUnprocessable();
    }
}
