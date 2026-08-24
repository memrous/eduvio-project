<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
