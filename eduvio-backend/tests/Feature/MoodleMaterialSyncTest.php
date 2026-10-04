<?php

namespace Tests\Feature;

use App\Jobs\MoodleSyncJob;
use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MoodleMaterialSyncTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'secret-wstoken-123';

    private const MOODLE = 'https://moodle.test';

    private const MATCHED_COURSE = ['id' => 10, 'shortname' => '2026-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'Matematická analýza'];

    private const OTHER_COURSE = ['id' => 20, 'shortname' => 'CS-KB-EN', 'fullname' => 'Kybernetická bezpečnost'];

    protected function setUp(): void
    {
        parent::setUp();
        config(['moodle.base_url' => self::MOODLE]);
    }

    private function createUser(): User
    {
        return User::create([
            'name'           => 'John Doe',
            'username'       => 'johndoe',
            'email'          => 'john@example.com',
            'password'       => 'password123',
            'moodle_wstoken' => self::TOKEN,
            'moodle_user_id' => 42,
        ]);
    }

    private function createSubject(User $user, string $code = 'MR', ?string $department = 'KAG'): Subject
    {
        return Subject::create([
            'user_id'    => $user->id,
            'code'       => $code,
            'name'       => "Subject {$code}",
            'credits'    => 5,
            'lecturer'   => 'Dr. Smith',
            'department' => $department,
            'semester'   => 'ZS 2026',
        ]);
    }

    private function module(int $id, string $modname, string $name, array $extra = []): array
    {
        return array_merge([
            'id'          => $id,
            'name'        => $name,
            'modname'     => $modname,
            'url'         => self::MOODLE . "/mod/{$modname}/view.php?id={$id}",
            'uservisible' => true,
        ], $extra);
    }

    private function section(string $name, array $modules): array
    {
        return ['id' => crc32($name), 'name' => $name, 'modules' => $modules];
    }

    /**
     * Fake Moodle WS. $contentsByCourse maps course id => sections returned by
     * core_course_get_contents; courses listed in $failingCourseIds return an error.
     */
    private function fakeMoodle(array $courses, array $contentsByCourse, array $failingCourseIds = []): void
    {
        // Http::fake() appends to existing stubs; start from a clean factory so a re-fake replaces them.
        Http::swap(new HttpFactory());

        Http::fake(function (Request $request) use ($courses, $contentsByCourse, $failingCourseIds) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            return match ($query['wsfunction'] ?? null) {
                'core_enrol_get_users_courses' => Http::response($courses),
                'mod_assign_get_assignments'   => Http::response(['courses' => [], 'warnings' => []]),
                'core_course_get_contents'     => in_array((int) $query['courseid'], $failingCourseIds, true)
                    ? Http::response(['exception' => 'moodle_exception', 'errorcode' => 'servicenotavailable', 'message' => 'Down'])
                    : Http::response($contentsByCourse[(int) $query['courseid']] ?? []),
                default => Http::response(['exception' => 'moodle_exception', 'errorcode' => 'unknown'], 200),
            };
        });
    }

    private function runSync(User $user): void
    {
        MoodleSyncJob::dispatchSync($user->fresh());
        $this->assertSame('success', $user->fresh()->moodle_sync_status, (string) $user->fresh()->moodle_sync_error);
    }

    private function material(int $cmid): Material
    {
        return Material::where('moodle_cmid', $cmid)->firstOrFail();
    }

    public function test_material_from_matched_course_gets_subject_and_user(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Týden 1', [$this->module(500, 'page', 'Sylabus')])],
        ]);

        $this->runSync($user);

        $material = $this->material(500);
        $this->assertSame($subject->id, $material->subject_id);
        $this->assertSame($user->id, $material->user_id);
        $this->assertSame(10, $material->moodle_course_id);
        $this->assertSame('Sylabus', $material->title);
        $this->assertSame('file', $material->category);
        $this->assertSame('LINK', $material->type);
        $this->assertSame('External Link', $material->size);
        $this->assertNull($material->file_name);
        $this->assertSame(self::MOODLE . '/mod/page/view.php?id=500', $material->url);
        $this->assertSame('Moodle: Matematická analýza – Týden 1', $material->description);
    }

    public function test_material_from_unmatched_course_has_no_subject(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE, self::OTHER_COURSE], [
            20 => [$this->section('Úvod', [$this->module(600, 'folder', 'Podklady')])],
        ]);

        $this->runSync($user);

        $material = $this->material(600);
        $this->assertNull($material->subject_id);
        $this->assertSame($user->id, $material->user_id);
        $this->assertSame('Moodle: Kybernetická bezpečnost – Úvod', $material->description);
    }

    public function test_material_from_course_that_lost_newest_semester_is_skipped(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([
            ['id' => 9, 'shortname' => '2025-ZS-KAG/MR-Prezenční-ZS-', 'fullname' => 'MR 2025'],
            self::MATCHED_COURSE,
        ], [
            9  => [$this->section('Staré', [$this->module(900, 'page', 'Stará stránka')])],
            10 => [$this->section('Nové', [$this->module(1000, 'page', 'Nová stránka')])],
        ]);

        $this->runSync($user);

        $this->assertSame([1000], Material::pluck('moodle_cmid')->all());
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), 'core_course_get_contents')
            && str_contains($r->url(), 'courseid=9'));
    }

    public function test_pdf_resource_gets_pdf_type_and_formatted_size(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Přednášky', [
                $this->module(501, 'resource', 'Přednáška 1', ['contents' => [[
                    'type'     => 'file',
                    'filename' => 'prednaska-1.PDF',
                    'filesize' => 1572864,
                    'fileurl'  => self::MOODLE . '/webservice/pluginfile.php/1/mod_resource/content/1/prednaska-1.pdf?forcedownload=1',
                ]]]),
                $this->module(502, 'resource', 'Slajdy', ['contents' => [['filename' => 'slajdy.pptx', 'filesize' => 2048]]]),
            ])],
        ]);

        $this->runSync($user);

        $pdf = $this->material(501);
        $this->assertSame('PDF', $pdf->type);
        $this->assertSame('1.5 MB', $pdf->size);
        $this->assertSame(self::MOODLE . '/mod/resource/view.php?id=501', $pdf->url);

        $slides = $this->material(502);
        $this->assertSame('SLIDES', $slides->type);
        $this->assertSame('2 KB', $slides->size);
    }

    public function test_url_module_stores_external_address(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Odkazy', [
                $this->module(503, 'url', 'Wolfram Alpha', ['contents' => [[
                    'type'    => 'url',
                    'fileurl' => 'https://www.wolframalpha.com/',
                ]]]),
            ])],
        ]);

        $this->runSync($user);

        $material = $this->material(503);
        $this->assertSame('https://www.wolframalpha.com/', $material->url);
        $this->assertSame('LINK', $material->type);
    }

    public function test_pluginfile_and_token_urls_are_never_stored(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Odkazy', [
                $this->module(504, 'url', 'Pluginfile', ['contents' => [[
                    'fileurl' => self::MOODLE . '/pluginfile.php/5/mod_url/intro/file.pdf',
                ]]]),
                $this->module(505, 'url', 'Token', ['contents' => [[
                    'fileurl' => 'https://example.com/download?token=' . self::TOKEN,
                ]]]),
                // Even the module URL itself is checked.
                $this->module(506, 'page', 'Podezřelá stránka', [
                    'url' => self::MOODLE . '/webservice/rest/server.php?wstoken=' . self::TOKEN,
                ]),
            ])],
        ]);

        $this->runSync($user);

        $this->assertSame(self::MOODLE . '/mod/url/view.php?id=504', $this->material(504)->url);
        $this->assertSame(self::MOODLE . '/mod/url/view.php?id=505', $this->material(505)->url);
        $this->assertSame(self::MOODLE . '/mod/page/view.php?id=506', $this->material(506)->url);

        foreach (Material::pluck('url') as $url) {
            $this->assertStringNotContainsString('pluginfile.php', $url);
            $this->assertStringNotContainsString('webservice/', $url);
            $this->assertStringNotContainsString('token=', $url);
            $this->assertStringNotContainsString(self::TOKEN, $url);
        }
    }

    public function test_locked_module_with_availability_info_is_imported_as_locked(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Zkouška', [
                $this->module(507, 'resource', 'Řešení', [
                    'uservisible'      => false,
                    'availabilityinfo' => '<div class="availabilityinfo">Not available unless: <strong>It is on or after 1 December 2026</strong></div>',
                ]),
            ])],
        ]);

        $this->runSync($user);

        $this->assertSame(
            "Moodle: Matematická analýza – Zkouška\nZamčeno: Not available unless: It is on or after 1 December 2026",
            $this->material(507)->description,
        );
    }

    public function test_hidden_module_without_availability_info_and_non_material_modules_are_skipped(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Týden 1', [
                $this->module(508, 'resource', 'Skrytý', ['uservisible' => false]),
                $this->module(509, 'page', 'Skrytý prázdný', ['uservisible' => false, 'availabilityinfo' => '  ']),
                $this->module(510, 'assign', 'Úkol'),
                $this->module(511, 'quiz', 'Test'),
                $this->module(512, 'forum', 'Fórum'),
                $this->module(513, 'label', 'Popisek'),
                $this->module(514, 'book', 'Skripta'),
            ])],
        ]);

        $this->runSync($user);

        $this->assertSame([514], Material::pluck('moodle_cmid')->all());
    }

    public function test_second_run_does_not_create_duplicates(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE, self::OTHER_COURSE], [
            10 => [$this->section('Týden 1', [$this->module(500, 'page', 'Sylabus')])],
            20 => [$this->section('Úvod', [$this->module(600, 'folder', 'Podklady')])],
        ]);

        $this->runSync($user);
        $this->runSync($user);

        $this->assertSame(2, Material::count());
    }

    public function test_removed_module_is_deleted_and_manual_material_is_kept(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user);
        $manual = Material::create([
            'subject_id' => $subject->id,
            'title'      => 'Moje poznámky',
            'type'       => 'NOTES',
            'url'        => 'https://example.com/notes',
            'category'   => 'file',
        ]);
        $manualOther = Material::create([
            'user_id'  => $user->id,
            'title'    => 'Obecný odkaz',
            'type'     => 'LINK',
            'url'      => 'https://example.com/other',
            'category' => 'file',
        ]);

        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Týden 1', [
                $this->module(500, 'page', 'Sylabus'),
                $this->module(501, 'page', 'Zrušená stránka'),
            ])],
        ]);
        $this->runSync($user);
        $this->assertSame(4, Material::count());

        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Týden 1', [$this->module(500, 'page', 'Sylabus')])],
        ]);
        $this->runSync($user);

        $this->assertNull(Material::where('moodle_cmid', 501)->first());
        $this->assertNotNull(Material::where('moodle_cmid', 500)->first());
        $this->assertNotNull($manual->fresh());
        $this->assertNotNull($manualOther->fresh());
    }

    public function test_failed_course_contents_keep_its_materials(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $courses = [self::MATCHED_COURSE, self::OTHER_COURSE];

        $this->fakeMoodle($courses, [
            10 => [$this->section('Týden 1', [$this->module(500, 'page', 'Sylabus'), $this->module(501, 'page', 'Zrušená')])],
            20 => [$this->section('Úvod', [$this->module(600, 'folder', 'Podklady')])],
        ]);
        $this->runSync($user);
        $this->assertSame(3, Material::count());

        // Course 20 is down; course 10 dropped module 501.
        $this->fakeMoodle($courses, [
            10 => [$this->section('Týden 1', [$this->module(500, 'page', 'Sylabus')])],
        ], failingCourseIds: [20]);
        $this->runSync($user);

        $this->assertEqualsCanonicalizing([500, 600], Material::pluck('moodle_cmid')->all());
    }

    public function test_materials_of_other_users_are_not_touched(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $other = User::create([
            'name'     => 'Jane Doe',
            'username' => 'janedoe',
            'email'    => 'jane@example.com',
            'password' => 'password123',
        ]);
        Material::create([
            'user_id'          => $other->id,
            'moodle_cmid'      => 999,
            'moodle_course_id' => 10,
            'title'            => 'Cizí materiál',
            'type'             => 'LINK',
            'url'              => self::MOODLE . '/mod/page/view.php?id=999',
            'category'         => 'file',
        ]);

        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->section('Týden 1', [$this->module(500, 'page', 'Sylabus')])],
        ]);
        $this->runSync($user);

        $this->assertNotNull(Material::where('moodle_cmid', 999)->where('user_id', $other->id)->first());
    }

    private const SECTION_LOCK_HTML = '<div class="availabilityinfo"><ul><li>Patříte k <strong>Rozvrh. akce St, 09:45 - 11:15,  LP-5032 [1088157]</strong></li></ul></div>';

    /**
     * Section hidden as a whole by an access restriction: no modules, uservisible = false.
     */
    private function lockedSection(int $id, int $number, string $name, ?string $availabilityInfo = self::SECTION_LOCK_HTML): array
    {
        return [
            'id'               => $id,
            'section'          => $number,
            'name'             => $name,
            'uservisible'      => false,
            'availabilityinfo' => $availabilityInfo,
            'modules'          => [],
        ];
    }

    public function test_locked_section_is_imported_as_one_link_material(): void
    {
        $user = $this->createUser();
        $subject = $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->lockedSection(3001, 2, 'Cvičení 2')],
        ]);

        $this->runSync($user);

        $this->assertSame(1, Material::count());
        $material = Material::where('moodle_section_id', 3001)->firstOrFail();
        $this->assertNull($material->moodle_cmid);
        $this->assertSame(10, $material->moodle_course_id);
        $this->assertSame($subject->id, $material->subject_id);
        $this->assertSame($user->id, $material->user_id);
        $this->assertSame('Cvičení 2', $material->title);
        $this->assertSame('LINK', $material->type);
        $this->assertSame('file', $material->category);
        $this->assertSame('External Link', $material->size);
        $this->assertNull($material->file_name);
        $this->assertSame(self::MOODLE . '/course/view.php?id=10#section-2', $material->url);
        $this->assertSame(
            "Moodle: Matematická analýza\nZamčeno: Patříte k Rozvrh. akce St, 09:45 - 11:15, LP-5032 [1088157]",
            $material->description,
        );
    }

    public function test_locked_section_second_run_does_not_create_duplicate(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->lockedSection(3001, 1, 'Cvičení 1'), $this->lockedSection(3002, 2, 'Cvičení 2')],
        ]);

        $this->runSync($user);
        $this->runSync($user);

        $this->assertSame(2, Material::count());
        $this->assertEqualsCanonicalizing([3001, 3002], Material::pluck('moodle_section_id')->all());
    }

    public function test_unlocked_section_material_is_replaced_by_its_modules(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->lockedSection(3001, 1, 'Cvičení 1')],
        ]);
        $this->runSync($user);
        $this->assertSame(1, Material::where('moodle_section_id', 3001)->count());

        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [[
                'id'          => 3001,
                'section'     => 1,
                'name'        => 'Cvičení 1',
                'uservisible' => true,
                'modules'     => [$this->module(700, 'resource', 'Zadání', ['contents' => [['filename' => 'zadani.pdf', 'filesize' => 1024]]])],
            ]],
        ]);
        $this->runSync($user);

        $this->assertSame(0, Material::whereNotNull('moodle_section_id')->count());
        $this->assertSame([700], Material::pluck('moodle_cmid')->all());
        $this->assertSame('Moodle: Matematická analýza – Cvičení 1', $this->material(700)->description);
    }

    public function test_locked_section_without_availability_info_is_skipped(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [
                $this->lockedSection(3001, 1, 'Skrytá sekce', null),
                $this->lockedSection(3002, 2, 'Prázdná podmínka', '<div> </div>'),
            ],
        ]);

        $this->runSync($user);

        $this->assertSame(0, Material::count());
    }

    public function test_locked_section_of_failed_course_is_kept(): void
    {
        $user = $this->createUser();
        $this->createSubject($user);
        $this->fakeMoodle([self::MATCHED_COURSE], [
            10 => [$this->lockedSection(3001, 1, 'Cvičení 1')],
        ]);
        $this->runSync($user);

        $this->fakeMoodle([self::MATCHED_COURSE], [], failingCourseIds: [10]);
        $this->runSync($user);

        $this->assertSame(1, Material::where('moodle_section_id', 3001)->count());
    }
}
