<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\Event;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubjectFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_delete_their_own_subject_and_associated_relations(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $subject = Subject::create([
            'user_id' => $user->id,
            'code' => 'KMI/ALGO1',
            'name' => 'Algorithms 1',
            'credits' => 5,
            'lecturer' => 'Dr. Smith',
            'completion_type' => 'Credit',
            'is_mandatory' => true,
            'semester' => 'Winter',
            'description' => 'Intro to algorithms',
        ]);

        $event = Event::create([
            'subject_id' => $subject->id,
            'title' => 'Lecture 1',
            'type' => 'Lecture',
            'date' => '2026-06-26',
            'time' => '10:00',
            'end_time' => '12:00',
            'status' => 'Pending',
        ]);

        $material = Material::create([
            'subject_id' => $subject->id,
            'title' => 'Lecture Notes',
            'type' => 'pdf',
            'description' => 'Notes for week 1',
            'url' => 'https://example.com/notes.pdf',
            'size' => '2.5 MB',
        ]);

        // Assert they exist in DB
        $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
        $this->assertDatabaseHas('events', ['id' => $event->id]);
        $this->assertDatabaseHas('resources', ['id' => $material->id]);

        // Send delete request
        $response = $this->deleteJson("/api/subjects/{$subject->id}");

        // Assert response
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Subject deleted successfully.',
                'id' => $subject->id,
            ]);

        // Assert they are deleted from DB
        $this->assertDatabaseMissing('subjects', ['id' => $subject->id]);
        $this->assertDatabaseMissing('events', ['id' => $event->id]);
        $this->assertDatabaseMissing('resources', ['id' => $material->id]);
    }

    public function test_user_cannot_delete_another_users_subject(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $subject = Subject::create([
            'user_id' => $user2->id,
            'code' => 'KMI/ALGO1',
            'name' => 'Algorithms 1',
            'credits' => 5,
            'lecturer' => 'Dr. Smith',
            'completion_type' => 'Credit',
            'is_mandatory' => true,
            'semester' => 'Winter',
        ]);

        Sanctum::actingAs($user1);

        $response = $this->deleteJson("/api/subjects/{$subject->id}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
    }

    public function test_user_can_create_subject_with_guarantor_and_pass_threshold(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            'code' => 'KMI/ALGO2',
            'name' => 'Algorithms 2',
            'credits' => 6,
            'lecturer' => 'Prof. Brown',
            'semester' => 'Summer',
            'guarantor' => 'Alice Green',
            'passThreshold' => 50,
        ];

        $response = $this->postJson('/api/subjects', $payload);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'code' => 'KMI/ALGO2',
                'name' => 'Algorithms 2',
                'guarantor' => 'Alice Green',
                'passThreshold' => 50,
            ]);

        $this->assertDatabaseHas('subjects', [
            'user_id' => $user->id,
            'code' => 'KMI/ALGO2',
            'guarantor' => 'Alice Green',
            'pass_threshold' => 50,
        ]);
    }

    public function test_user_can_manage_global_materials(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Store global material (subjectId is null)
        $payload = [
            'subjectId' => null,
            'title' => 'Global Guide',
            'type' => 'pdf',
            'url' => 'https://example.com/guide.pdf',
            'category' => 'file',
        ];

        $responseStore = $this->postJson('/api/materials', $payload);
        $responseStore->assertStatus(201)
            ->assertJsonFragment([
                'title' => 'Global Guide',
                'category' => 'file',
                'subjectId' => null,
            ]);

        $materialId = $responseStore->json('id');

        $this->assertDatabaseHas('resources', [
            'id' => $materialId,
            'user_id' => $user->id,
            'subject_id' => null,
            'category' => 'file',
        ]);

        // Get materials list (should contain our global material)
        $responseIndex = $this->getJson('/api/materials');
        $responseIndex->assertStatus(200)
            ->assertJsonFragment(['title' => 'Global Guide']);

        // Delete the global material
        $responseDelete = $this->deleteJson("/api/materials/{$materialId}");
        $responseDelete->assertStatus(200);

        $this->assertDatabaseMissing('resources', [
            'id' => $materialId,
        ]);
    }
}
