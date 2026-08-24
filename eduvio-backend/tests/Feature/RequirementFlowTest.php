<?php

namespace Tests\Feature;

use App\Models\Subject;
use App\Models\Requirement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RequirementFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_requirements_optionally_filtered_by_subject(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $subject1 = Subject::create([
            'user_id' => $user->id,
            'code' => 'SUBJ1',
            'name' => 'Subject 1',
            'credits' => 4,
            'lecturer' => 'T1',
            'completion_type' => 'Exam',
            'is_mandatory' => true,
            'semester' => 'Winter',
        ]);

        $subject2 = Subject::create([
            'user_id' => $user->id,
            'code' => 'SUBJ2',
            'name' => 'Subject 2',
            'credits' => 3,
            'lecturer' => 'T2',
            'completion_type' => 'Credit',
            'is_mandatory' => false,
            'semester' => 'Summer',
        ]);

        $req1 = Requirement::create([
            'subject_id' => $subject1->id,
            'type' => 'homework',
            'title' => 'HW 1',
            'completed' => false,
        ]);

        $req2 = Requirement::create([
            'subject_id' => $subject2->id,
            'type' => 'test',
            'title' => 'Test 1',
            'completed' => true,
        ]);

        // Get all requirements
        $response = $this->getJson('/api/requirements');
        $response->assertStatus(200)
            ->assertJsonCount(2);

        // Filter by subject1
        $responseFiltered = $this->getJson("/api/requirements?subjectId={$subject1->id}");
        $responseFiltered->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'HW 1']);
    }

    public function test_user_can_create_requirement(): void
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

        $payload = [
            'subjectId' => $subject->id,
            'type' => 'project',
            'title' => 'Term Project',
            'context' => 'Project description here',
            'dueDate' => '2026-08-30',
            'dueTime' => '23:59',
            'weight' => 20,
            'maxPoints' => 100,
            'gainedPoints' => 85,
            'completed' => true,
        ];

        $response = $this->postJson('/api/requirements', $payload);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'title' => 'Term Project',
                'type' => 'project',
                'completed' => true,
            ]);

        $this->assertDatabaseHas('requirements', [
            'subject_id' => $subject->id,
            'title' => 'Term Project',
            'type' => 'project',
            'weight' => 20,
            'completed' => true,
        ]);
    }

    public function test_user_can_update_requirement(): void
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

        $requirement = Requirement::create([
            'subject_id' => $subject->id,
            'type' => 'homework',
            'title' => 'HW 1',
            'completed' => false,
        ]);

        $payload = [
            'subjectId' => $subject->id,
            'title' => 'HW 1 Updated',
            'completed' => true,
        ];

        $response = $this->putJson("/api/requirements/{$requirement->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'title' => 'HW 1 Updated',
                'completed' => true,
            ]);

        $this->assertDatabaseHas('requirements', [
            'id' => $requirement->id,
            'title' => 'HW 1 Updated',
            'completed' => true,
        ]);
    }

    public function test_user_can_delete_requirement(): void
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

        $requirement = Requirement::create([
            'subject_id' => $subject->id,
            'type' => 'homework',
            'title' => 'HW 1',
            'completed' => false,
        ]);

        $response = $this->deleteJson("/api/requirements/{$requirement->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Requirement deleted successfully.',
                'id' => $requirement->id,
            ]);

        $this->assertDatabaseMissing('requirements', [
            'id' => $requirement->id,
        ]);
    }

    public function test_user_cannot_access_or_modify_another_users_requirement(): void
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

        $requirement = Requirement::create([
            'subject_id' => $subjectOfUser2->id,
            'type' => 'homework',
            'title' => 'HW of User 2',
            'completed' => false,
        ]);

        Sanctum::actingAs($user1);

        // Try to update
        $updateResponse = $this->putJson("/api/requirements/{$requirement->id}", [
            'subjectId' => $subjectOfUser2->id,
            'title' => 'Attempted Hack',
        ]);
        $updateResponse->assertStatus(404);

        // Try to delete
        $deleteResponse = $this->deleteJson("/api/requirements/{$requirement->id}");
        $deleteResponse->assertStatus(404);

        $this->assertDatabaseHas('requirements', [
            'id' => $requirement->id,
            'title' => 'HW of User 2',
        ]);
    }
}
