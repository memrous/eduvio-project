<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Uploaded files are on the private disk and only reachable through
 * GET /api/materials/{id}/file with the owner's token.
 */
class MaterialFileTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
        $this->user = User::factory()->create();
        $this->subject = Subject::create([
            'user_id'  => $this->user->id,
            'code'     => 'ZPP1',
            'name'     => 'Základy programování',
            'credits'  => 4,
            'lecturer' => 'Dr. Smith',
            'semester' => 'ZS 2026',
        ]);
    }

    private function upload(string $name = 'slajdy.pdf', string $mime = 'application/pdf'): Material
    {
        $file = $mime === 'application/pdf'
            ? UploadedFile::fake()->createWithContent($name, "%PDF-1.4\nobsah")
            : UploadedFile::fake()->create($name, 10, $mime);

        $id = $this->actingAs($this->user, 'sanctum')->post('/api/materials', [
            'subjectId' => $this->subject->id,
            'title'     => 'Slajdy',
            'type'      => 'PDF',
            'file'      => $file,
        ], ['Accept' => 'application/json'])->assertCreated()->json('id');

        return Material::findOrFail($id);
    }

    public function test_upload_goes_to_the_private_disk(): void
    {
        $material = $this->upload();

        Storage::disk('local')->assertExists($material->file_path);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertStringEndsWith("/api/materials/{$material->id}/file", $material->url);

        // Clients see whether there is a file, never the storage path
        $this->actingAs($this->user, 'sanctum')->getJson('/api/materials')
            ->assertOk()
            ->assertJsonPath('0.has_file', true)
            ->assertJsonMissingPath('0.file_path');
    }

    public function test_owner_gets_the_file_inline_with_its_content_type(): void
    {
        $material = $this->upload('Přednáška 1.pdf');

        $response = $this->actingAs($this->user, 'sanctum')->get("/api/materials/{$material->id}/file");

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('inline', $response->headers->get('Content-Disposition'));
        $this->assertSame("%PDF-1.4\nobsah", $response->streamedContent());
    }

    public function test_download_parameter_sends_an_attachment(): void
    {
        $material = $this->upload();

        $response = $this->actingAs($this->user, 'sanctum')->get("/api/materials/{$material->id}/file?download=1");

        $response->assertOk();
        $this->assertStringStartsWith('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('slajdy.pdf', $response->headers->get('Content-Disposition'));
    }

    public function test_foreign_file_is_not_found(): void
    {
        $material = $this->upload();

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson("/api/materials/{$material->id}/file")
            ->assertNotFound();
    }

    public function test_file_needs_login(): void
    {
        $material = $this->upload();
        $this->app['auth']->forgetGuards();

        $this->getJson("/api/materials/{$material->id}/file")->assertUnauthorized();
    }

    public function test_materials_disk_is_configurable(): void
    {
        // Production: MATERIALS_DISK=s3 (Supabase Storage over the S3 API)
        config(['filesystems.materials_disk' => 's3']);
        Storage::fake('s3');

        $material = $this->upload();

        Storage::disk('s3')->assertExists($material->file_path);
        $this->assertSame([], Storage::disk('local')->allFiles());

        $response = $this->actingAs($this->user, 'sanctum')->get("/api/materials/{$material->id}/file");
        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame("%PDF-1.4\nobsah", $response->streamedContent());

        $this->actingAs($this->user, 'sanctum')->deleteJson("/api/materials/{$material->id}")->assertOk();
        Storage::disk('s3')->assertMissing($material->file_path);
    }

    public function test_link_has_no_file(): void
    {
        $link = Material::create([
            'subject_id' => $this->subject->id, 'title' => 'Web', 'type' => 'LINK',
            'url' => 'https://example.org', 'category' => 'file',
        ]);

        $this->actingAs($this->user, 'sanctum')->getJson("/api/materials/{$link->id}/file")->assertNotFound();
    }

    // ── Moving files uploaded before the change ─────────────────

    public function test_command_moves_public_files_to_the_private_disk(): void
    {
        Storage::disk('public')->put('materials/stary.pdf', 'stary obsah');
        $old = Material::create([
            'subject_id' => $this->subject->id, 'title' => 'Starý', 'type' => 'PDF', 'category' => 'file',
            'url' => 'http://localhost/storage/materials/stary.pdf', 'file_name' => 'stary.pdf',
        ]);
        $gone = Material::create([
            'subject_id' => $this->subject->id, 'title' => 'Chybí', 'type' => 'PDF', 'category' => 'file',
            'url' => 'http://localhost/storage/materials/chybi.pdf', 'file_name' => 'chybi.pdf',
        ]);

        $this->artisan('materials:move-to-private', ['--dry-run' => true])->assertSuccessful();
        Storage::disk('public')->assertExists('materials/stary.pdf');
        $this->assertNull($old->fresh()->file_path);

        $this->artisan('materials:move-to-private')->assertSuccessful();

        $old->refresh();
        $this->assertSame('materials/stary.pdf', $old->file_path);
        $this->assertStringEndsWith("/api/materials/{$old->id}/file", $old->url);
        Storage::disk('local')->assertExists('materials/stary.pdf');
        Storage::disk('public')->assertMissing('materials/stary.pdf');
        $this->assertNull($gone->fresh()->file_path);

        $this->actingAs($this->user, 'sanctum')->get("/api/materials/{$old->id}/file")->assertOk();

        // Running again changes nothing
        $this->artisan('materials:move-to-private')->assertSuccessful();
        $this->assertSame('materials/stary.pdf', $old->fresh()->file_path);
    }
}
