<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialLessonAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Subject $subject;
    private Event $lesson;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = $this->createUser('john');
        $this->subject = $this->createSubject($this->user, 'UNIXS');
        $this->lesson = $this->createLesson($this->subject, '2026-10-07');
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

    private function createSubject(User $user, string $code): Subject
    {
        return Subject::create([
            'user_id'  => $user->id,
            'code'     => $code,
            'name'     => "Subject {$code}",
            'credits'  => 5,
            'lecturer' => 'Dr. Smith',
            'semester' => 'ZS 2026',
        ]);
    }

    private function createLesson(Subject $subject, string $date): Event
    {
        return Event::create([
            'subject_id' => $subject->id,
            'title'      => "{$subject->name} (Cvičení)",
            'date'       => $date,
            'time'       => '09:45',
            'end_time'   => '11:15',
            'type'       => 'Cvičení',
            'source'     => 'stag',
        ]);
    }

    private function createMaterial(array $overrides = []): Material
    {
        return Material::create(array_merge([
            'subject_id' => $this->subject->id,
            'title'      => 'Slajdy',
            'type'       => 'PDF',
            'url'        => '/storage/materials/slajdy.pdf',
            'category'   => 'file',
        ], $overrides));
    }

    private function upload(array $payload)
    {
        return $this->actingAs($this->user, 'sanctum')->postJson('/api/materials', array_merge([
            'subjectId' => $this->subject->id,
            'title'     => 'Řešení úkolu',
            'type'      => 'LINK',
            'url'       => 'https://example.org/reseni',
        ], $payload));
    }

    // ─── Upload ─────────────────────────────────────────────────

    public function test_upload_with_lesson_assigns_it(): void
    {
        $this->upload(['eventId' => $this->lesson->id])
            ->assertCreated()
            ->assertJsonPath('eventId', $this->lesson->id);
    }

    public function test_upload_without_lesson_is_general(): void
    {
        $id = $this->upload([])->assertCreated()->json('id');

        $this->assertNull(Material::find($id)->event_id);
    }

    public function test_upload_with_lesson_of_another_users_subject_is_rejected(): void
    {
        $foreignLesson = $this->createLesson($this->createSubject($this->createUser('eve'), 'ALGO'), '2026-10-07');

        $this->upload(['eventId' => $foreignLesson->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('eventId');
        $this->assertSame(0, Material::count());
    }

    public function test_upload_with_lesson_of_another_own_subject_is_rejected(): void
    {
        $otherLesson = $this->createLesson($this->createSubject($this->user, 'STRUP'), '2026-10-07');

        $this->upload(['eventId' => $otherLesson->id])->assertUnprocessable()->assertJsonValidationErrors('eventId');
        $this->upload(['subjectId' => null, 'eventId' => $this->lesson->id])->assertUnprocessable()->assertJsonValidationErrors('eventId');
    }

    // ─── Moving existing materials ──────────────────────────────

    public function test_material_can_be_moved_to_lesson_and_back_to_general(): void
    {
        $material = $this->createMaterial();
        $this->actingAs($this->user, 'sanctum');

        $this->patchJson("/api/materials/{$material->id}", ['eventId' => $this->lesson->id])
            ->assertOk()
            ->assertJsonPath('eventId', $this->lesson->id)
            ->assertJsonPath('event_manually_set', true);

        $this->patchJson("/api/materials/{$material->id}", ['eventId' => null])
            ->assertOk()
            ->assertJsonPath('eventId', null);

        $material->refresh();
        $this->assertNull($material->event_id);
        $this->assertTrue($material->event_manually_set);
    }

    public function test_move_to_foreign_lesson_is_rejected(): void
    {
        $material = $this->createMaterial();
        $foreignLesson = $this->createLesson($this->createSubject($this->createUser('eve'), 'ALGO'), '2026-10-07');
        $otherOwnLesson = $this->createLesson($this->createSubject($this->user, 'STRUP'), '2026-10-07');
        $this->actingAs($this->user, 'sanctum');

        $this->patchJson("/api/materials/{$material->id}", ['eventId' => $foreignLesson->id])
            ->assertUnprocessable()->assertJsonValidationErrors('eventId');
        $this->patchJson("/api/materials/{$material->id}", ['eventId' => $otherOwnLesson->id])
            ->assertUnprocessable()->assertJsonValidationErrors('eventId');
        $this->patchJson("/api/materials/{$material->id}", ['eventId' => 999999])
            ->assertUnprocessable()->assertJsonValidationErrors('eventId');

        $this->assertNull($material->fresh()->event_id);
        $this->assertFalse($material->fresh()->event_manually_set);
    }

    public function test_material_without_subject_can_only_stay_general(): void
    {
        $material = $this->createMaterial(['subject_id' => null, 'user_id' => $this->user->id]);
        $this->actingAs($this->user, 'sanctum');

        $this->patchJson("/api/materials/{$material->id}", ['eventId' => $this->lesson->id])->assertUnprocessable();
        $this->patchJson("/api/materials/{$material->id}", ['eventId' => null])->assertOk();
    }

    public function test_move_requires_event_id_key_and_own_material(): void
    {
        $material = $this->createMaterial();

        $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/materials/{$material->id}", [])
            ->assertUnprocessable()->assertJsonValidationErrors('material');

        $this->actingAs($this->createUser('eve'), 'sanctum')
            ->patchJson("/api/materials/{$material->id}", ['eventId' => null])
            ->assertNotFound();
    }

    public function test_semester_links_cannot_be_moved(): void
    {
        $link = $this->createMaterial([
            'user_id' => $this->user->id, 'type' => 'LINK', 'url' => 'https://example.org', 'category' => 'platform',
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/materials/{$link->id}", ['eventId' => $this->lesson->id])
            ->assertUnprocessable();
        $this->assertNull($link->fresh()->event_id);
    }
}
