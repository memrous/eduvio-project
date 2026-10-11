<?php

namespace Tests\Feature;

use App\Jobs\DepartmentLinksSyncJob;
use App\Models\Event;
use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaterialManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->user = $this->createUser('john');
        $this->subject = $this->createSubject($this->user, 'UNIXS');
    }

    private function createUser(string $name): User
    {
        return User::create([
            'name'     => ucfirst($name),
            'username' => $name,
            'email'    => "{$name}@example.com",
            'password' => 'password123',
        ]);
    }

    private function createSubject(User $user, string $code, array $overrides = []): Subject
    {
        return Subject::create(array_merge([
            'user_id'  => $user->id,
            'code'     => $code,
            'name'     => "Subject {$code}",
            'credits'  => 5,
            'lecturer' => 'Dr. Smith',
            'semester' => 'ZS 2026',
        ], $overrides));
    }

    /** Upload a file through the API, as the frontend does. */
    private function uploadFile(string $name = 'slajdy.pdf'): Material
    {
        $id = $this->actingAs($this->user, 'sanctum')->post('/api/materials', [
            'subjectId' => $this->subject->id,
            'title'     => 'Slajdy',
            'type'      => 'PDF',
            'file'      => UploadedFile::fake()->create($name, 120, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('id');

        return Material::findOrFail($id);
    }

    private function manualLink(array $overrides = []): Material
    {
        return Material::create(array_merge([
            'subject_id' => $this->subject->id,
            'title'      => 'Řešené příklady',
            'type'       => 'LINK',
            'url'        => 'https://example.org/priklady',
            'category'   => 'file',
            'size'       => 'External Link',
        ], $overrides));
    }

    private function moodleMaterial(array $overrides = []): Material
    {
        return Material::create(array_merge([
            'user_id'          => $this->user->id,
            'subject_id'       => $this->subject->id,
            'title'            => 'Sylabus',
            'type'             => 'LINK',
            'url'              => 'https://moodle.test/mod/page/view.php?id=500',
            'category'         => 'file',
            'moodle_cmid'      => 500,
            'moodle_course_id' => 10,
        ], $overrides));
    }

    private function storedPath(Material $material): string
    {
        return $material->storedFilePath();
    }

    // ─── Editing own materials ──────────────────────────────────

    public function test_manual_link_can_be_edited(): void
    {
        $link = $this->manualLink();
        $other = $this->createSubject($this->user, 'STRUP');

        $this->actingAs($this->user, 'sanctum')->patchJson("/api/materials/{$link->id}", [
            'title'       => 'Příklady k zápočtu',
            'description' => 'Od cvičícího',
            'type'        => 'NOTES',
            'url'         => 'https://example.org/zapocet',
            'subjectId'   => $other->id,
        ])->assertOk()
            ->assertJsonPath('title', 'Příklady k zápočtu')
            ->assertJsonPath('subjectId', $other->id)
            ->assertJsonPath('url', 'https://example.org/zapocet');

        $link->refresh();
        $this->assertSame('NOTES', $link->type);
        $this->assertSame('Od cvičícího', $link->description);
    }

    public function test_moving_to_other_subject_drops_lesson_and_jine_keeps_ownership(): void
    {
        $lesson = Event::create(['subject_id' => $this->subject->id, 'title' => 'Cvičení', 'date' => '2026-10-07', 'type' => 'Cvičení']);
        $link = $this->manualLink(['event_id' => $lesson->id]);
        $this->actingAs($this->user, 'sanctum');

        $this->patchJson("/api/materials/{$link->id}", ['subjectId' => null])
            ->assertOk()
            ->assertJsonPath('subjectId', null)
            ->assertJsonPath('eventId', null);

        // Still the user's material ("Jiné")
        $this->getJson('/api/materials')->assertOk()->assertJsonFragment(['id' => $link->id]);
        $this->patchJson("/api/materials/{$link->id}", ['title' => 'Jiný název'])->assertOk();
    }

    public function test_link_url_must_be_http_and_file_has_no_url(): void
    {
        $link = $this->manualLink();
        $file = $this->uploadFile();
        $this->actingAs($this->user, 'sanctum');

        $this->patchJson("/api/materials/{$link->id}", ['url' => 'javascript:alert(1)'])
            ->assertUnprocessable()->assertJsonValidationErrors('url');
        $this->patchJson("/api/materials/{$file->id}", ['url' => 'https://example.org/x.pdf'])
            ->assertUnprocessable()->assertJsonValidationErrors('url');
        $this->patchJson("/api/materials/{$link->id}", ['title' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors('title');
    }

    public function test_replacing_a_file_deletes_the_old_one(): void
    {
        $material = $this->uploadFile('stare.pdf');
        $oldPath = $this->storedPath($material);
        Storage::disk('public')->assertExists($oldPath);

        $this->actingAs($this->user, 'sanctum')->post("/api/materials/{$material->id}", [
            '_method' => 'PATCH',
            'title'   => 'Slajdy 2026',
            'file'    => UploadedFile::fake()->create('nove.pdf', 80, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('file_name', 'nove.pdf');

        $material->refresh();
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($this->storedPath($material));
        $this->assertSame('Slajdy 2026', $material->title);
    }

    public function test_link_cannot_get_a_file(): void
    {
        $link = $this->manualLink();

        $this->actingAs($this->user, 'sanctum')->post("/api/materials/{$link->id}", [
            '_method' => 'PATCH',
            'file'    => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    // ─── Moodle and automatic materials ─────────────────────────

    public function test_moodle_material_content_cannot_be_edited(): void
    {
        $material = $this->moodleMaterial();
        $this->actingAs($this->user, 'sanctum');

        foreach (['title' => 'X', 'description' => 'X', 'type' => 'PDF', 'url' => 'https://example.org', 'subjectId' => null] as $field => $value) {
            $this->patchJson("/api/materials/{$material->id}", [$field => $value])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }

        $this->assertSame('Sylabus', $material->fresh()->title);
        // Lesson assignment and hiding are allowed
        $this->patchJson("/api/materials/{$material->id}", ['eventId' => null])->assertOk();
        $this->patchJson("/api/materials/{$material->id}", ['hidden' => true])->assertOk();
        $this->assertNotNull($material->fresh()->hidden_at);
    }

    public function test_auto_link_content_cannot_be_patched(): void
    {
        $link = Material::create([
            'user_id' => $this->user->id, 'subject_id' => $this->subject->id, 'title' => null, 'type' => 'LINK',
            'url' => 'http://outrata.inf.upol.cz/courses/unixs', 'category' => 'platform', 'link_source' => 'auto',
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/materials/{$link->id}", ['url' => 'https://example.org'])
            ->assertUnprocessable()->assertJsonValidationErrors('url');
    }

    // ─── Deleting ───────────────────────────────────────────────

    public function test_deleting_own_file_removes_it_from_disk(): void
    {
        $material = $this->uploadFile();
        $path = $this->storedPath($material);

        $this->actingAs($this->user, 'sanctum')->deleteJson("/api/materials/{$material->id}")->assertOk();

        $this->assertModelMissing($material);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_deleting_own_link_works(): void
    {
        $link = $this->manualLink();

        $this->actingAs($this->user, 'sanctum')->deleteJson("/api/materials/{$link->id}")->assertOk();

        $this->assertModelMissing($link);
    }

    public function test_moodle_and_auto_materials_cannot_be_deleted(): void
    {
        $moodle = $this->moodleMaterial();
        $locked = $this->moodleMaterial(['moodle_cmid' => null, 'moodle_section_id' => 3001]);
        $auto = Material::create([
            'user_id' => $this->user->id, 'subject_id' => $this->subject->id, 'title' => null, 'type' => 'LINK',
            'url' => 'http://outrata.inf.upol.cz/courses/unixs', 'category' => 'platform', 'link_source' => 'auto',
        ]);
        $this->actingAs($this->user, 'sanctum');

        foreach ([$moodle, $locked, $auto] as $material) {
            $this->deleteJson("/api/materials/{$material->id}")->assertUnprocessable();
            $this->assertModelExists($material);
        }
    }

    // ─── Hiding ─────────────────────────────────────────────────

    public function test_hide_and_unhide(): void
    {
        $material = $this->moodleMaterial();
        $this->actingAs($this->user, 'sanctum');

        $this->postJson("/api/materials/{$material->id}/hide")->assertOk();
        $this->assertNotNull($material->fresh()->hidden_at);
        $this->getJson('/api/materials')->assertOk()->assertJsonPath('0.id', $material->id)->assertJsonPath('0.hidden_at', fn ($v) => $v !== null);

        $this->postJson("/api/materials/{$material->id}/unhide")->assertOk();
        $this->assertNull($material->fresh()->hidden_at);
    }

    public function test_own_materials_are_not_hidden(): void
    {
        $link = $this->manualLink();
        $this->actingAs($this->user, 'sanctum');

        $this->postJson("/api/materials/{$link->id}/hide")->assertUnprocessable();
        $this->patchJson("/api/materials/{$link->id}", ['hidden' => true])->assertUnprocessable()->assertJsonValidationErrors('hidden');
    }

    public function test_hidden_auto_link_stays_hidden_after_department_sync(): void
    {
        config(['departments.min_request_interval_ms' => 0]);
        $subject = $this->createSubject($this->user, 'STRUP', ['department' => 'KMI', 'guarantor' => 'doc. Mgr. Jan Outrata, Ph.D.']);
        $fixture = fn (string $name) => file_get_contents(base_path("tests/Fixtures/inf-upol/{$name}"));
        Http::fake([
            'https://www.inf.upol.cz/robots.txt'       => Http::response("User-agent: *\nDisallow: /scripts/\n"),
            'https://www.inf.upol.cz/lide'             => Http::response($fixture('lide.html')),
            'https://www.inf.upol.cz/lide/jan-outrata' => Http::response($fixture('profile-jan-outrata.html')),
            'https://www.inf.upol.cz/lide/jan-outrata/vyuka' => Http::response($fixture('teaching-jan-outrata.html')),
            '*' => Http::response('Not Found', 404),
        ]);
        DepartmentLinksSyncJob::dispatchSync($this->user);
        $link = Material::where('subject_id', $subject->id)->where('link_source', 'auto')->firstOrFail();

        $this->actingAs($this->user, 'sanctum')->postJson("/api/materials/{$link->id}/hide")->assertOk();
        DepartmentLinksSyncJob::dispatchSync($this->user);

        $this->assertModelExists($link);
        $this->assertNotNull($link->fresh()->hidden_at);
        $this->assertSame(1, Material::where('subject_id', $subject->id)->where('link_source', 'auto')->count());
    }

    // ─── Ownership ──────────────────────────────────────────────

    public function test_foreign_material_is_not_found_for_every_action(): void
    {
        $link = $this->manualLink();
        $moodle = $this->moodleMaterial();
        $this->actingAs($this->createUser('eve'), 'sanctum');

        $this->patchJson("/api/materials/{$link->id}", ['title' => 'x'])->assertNotFound();
        $this->deleteJson("/api/materials/{$link->id}")->assertNotFound();
        $this->postJson("/api/materials/{$moodle->id}/hide")->assertNotFound();
        $this->postJson("/api/materials/{$moodle->id}/unhide")->assertNotFound();
        $this->assertModelExists($link);
        $this->assertNull($moodle->fresh()->hidden_at);
    }
}
