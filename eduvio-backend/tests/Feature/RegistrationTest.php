<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'johndoe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'username', 'email'],
                'token',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'username' => 'johndoe',
        ]);

        // Study details come from the STAG sync only, a new account has none
        $response->assertJsonPath('user.study_program', null)
            ->assertJsonMissingPath('user.university_id')
            ->assertJsonMissingPath('user.academic_year');
    }

    public function test_academic_fields_in_request_are_ignored(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Jana Nováková',
            'username' => 'jananovakova',
            'email' => 'jana@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            // Fields of the removed registration step and STAG fields must not be stored
            'university_id' => 1,
            'faculty_id' => 2,
            'study_program_id' => 3,
            'academic_year' => 2,
            'study_program' => 'Podvržený program',
            'faculty' => 'XYZ',
            'study_year' => 5,
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'jana@example.com')->firstOrFail();
        $this->assertNull($user->study_program);
        $this->assertNull($user->faculty);
        $this->assertNull($user->study_year);
        foreach (['university_id', 'faculty_id', 'study_program_id', 'academic_year'] as $column) {
            $this->assertFalse(Schema::hasColumn('users', $column), "users.{$column} should be dropped");
        }
    }

    private function registerAndGetToken(): string
    {
        return $this->postJson('/api/register', [
            'name' => 'Nový Student',
            'username' => 'novystudent',
            'email' => 'novy@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201)->json('token');
    }

    public function test_registered_user_can_connect_stag_in_server_mode(): void
    {
        config(['stag.mode' => 'server']);
        $token = $this->registerAndGetToken();

        // Fresh account: no study details, STAG not connected yet
        $this->withToken($token)->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('user.stag_connected', false)
            ->assertJsonPath('user.study_program', null);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user/stag/redirect')
            ->assertStatus(200)
            ->assertJsonStructure(['redirect_url']);
    }

    public function test_registered_user_can_connect_stag_in_agent_mode(): void
    {
        config(['stag.mode' => 'agent']);
        $token = $this->registerAndGetToken();

        $this->withToken($token)->postJson('/api/user/stag/agent-token')
            ->assertStatus(201)
            ->assertJsonStructure(['token']);

        $this->assertTrue(User::where('email', 'novy@example.com')->firstOrFail()->stag_connected);
    }

    public function test_drop_migration_can_be_rolled_back(): void
    {
        $path = 'database/migrations/2026_10_07_000004_drop_academic_catalogs.php';

        Artisan::call('migrate:rollback', ['--path' => [$path]]);
        $this->assertTrue(Schema::hasTable('universities'));
        $this->assertTrue(Schema::hasTable('study_programs'));
        $this->assertTrue(Schema::hasColumn('users', 'university_id'));
        $this->assertTrue(Schema::hasColumn('users', 'academic_year'));

        Artisan::call('migrate');
        $this->assertFalse(Schema::hasTable('universities'));
        $this->assertFalse(Schema::hasColumn('users', 'university_id'));
    }

    public function test_academic_catalog_endpoints_are_gone(): void
    {
        $this->getJson('/api/academic/universities')->assertStatus(404);
        $this->assertFalse(Schema::hasTable('universities'));
        $this->assertFalse(Schema::hasTable('faculties'));
        $this->assertFalse(Schema::hasTable('study_programs'));
    }

    public function test_registration_validation_fails_for_duplicate_email(): void
    {
        User::factory()->create([
            'email' => 'duplicate@example.com',
            'username' => 'original_user',
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'new_user',
            'email' => 'duplicate@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_validation_fails_for_duplicate_username(): void
    {
        User::factory()->create([
            'email' => 'original@example.com',
            'username' => 'duplicate_user',
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'duplicate_user',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }
}
