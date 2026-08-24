<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NoteFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_note_empty_by_default(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $subject = Subject::create([
            'user_id' => $user->id,
            'code' => 'SUBJ1',
            'name' => 'Subject 1',
            'credits' => 4,
            'lecturer' => 'T1',
            'completion_type' => 'Exam',
            'is_mandatory' => true,
            'semester' => 'Winter',
        ]);

        $response = $this->getJson("/api/subjects/{$subject->id}/note");

        $response->assertStatus(200)
            ->assertExactJson(['content' => null]);
    }

    public function test_user_can_create_and_update_note(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $subject = Subject::create([
            'user_id' => $user->id,
            'code' => 'SUBJ1',
            'name' => 'Subject 1',
            'credits' => 4,
            'lecturer' => 'T1',
            'completion_type' => 'Exam',
            'is_mandatory' => true,
            'semester' => 'Winter',
        ]);

        // Create
        $response = $this->putJson("/api/subjects/{$subject->id}/note", [
            'content' => 'First note draft'
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'subject_id' => $subject->id,
                'content' => 'First note draft'
            ]);

        $this->assertDatabaseHas('notes', [
            'subject_id' => $subject->id,
            'content' => 'First note draft'
        ]);

        // Update
        $responseUpdate = $this->putJson("/api/subjects/{$subject->id}/note", [
            'content' => 'Updated note draft'
        ]);

        $responseUpdate->assertStatus(200)
            ->assertJsonFragment([
                'subject_id' => $subject->id,
                'content' => 'Updated note draft'
            ]);

        $this->assertDatabaseHas('notes', [
            'subject_id' => $subject->id,
            'content' => 'Updated note draft'
        ]);

        // Show note now
        $responseShow = $this->getJson("/api/subjects/{$subject->id}/note");
        $responseShow->assertStatus(200)
            ->assertJsonFragment([
                'subject_id' => $subject->id,
                'content' => 'Updated note draft'
            ]);
    }

    public function test_user_cannot_access_or_modify_another_users_note(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $subjectOfUser2 = Subject::create([
            'user_id' => $user2->id,
            'code' => 'SUBJ2',
            'name' => 'Subject 2',
            'credits' => 3,
            'lecturer' => 'T2',
            'completion_type' => 'Credit',
            'is_mandatory' => false,
            'semester' => 'Summer',
        ]);

        Sanctum::actingAs($user1);

        // Try to get
        $getResponse = $this->getJson("/api/subjects/{$subjectOfUser2->id}/note");
        $getResponse->assertStatus(404);

        // Try to update
        $updateResponse = $this->putJson("/api/subjects/{$subjectOfUser2->id}/note", [
            'content' => 'Hack attempt'
        ]);
        $updateResponse->assertStatus(404);
    }
}
