<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Uses real Sanctum tokens so the "stag:sync" ability check runs as in production.
 */
class StagSyncStudentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function postAs(string $token, array $data): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token)->postJson('/api/stag/sync-student', $data);
    }

    private function agentToken(): string
    {
        return $this->user->createToken(User::STAG_AGENT_TOKEN, ['stag:sync'])->plainTextToken;
    }

    private function payload(): array
    {
        return [
            'nazevSp'                     => 'Aplikovaná informatika',
            'kodSp'                       => 'B0613A140005',
            'fakultaSp'                   => 'PRF',
            'formaSp'                     => 'P',
            'typSp'                       => 'B',
            'typSpKey'                    => '7',
            'rocnik'                      => '2',
            'stav'                        => 'S',
            'studReferentkaPrijmeniJmeno' => 'Nováková Jana',
            'studReferentkaEmail'         => 'jana.novakova@upol.cz',
            'studReferentkaTelefon'       => '585 634 000',
        ];
    }

    public function test_agent_token_stores_study_info(): void
    {
        $this->postAs($this->agentToken(), $this->payload())
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->user->refresh();
        $this->assertEquals('Aplikovaná informatika', $this->user->study_program);
        $this->assertEquals('B0613A140005', $this->user->study_program_code);
        $this->assertEquals('PRF', $this->user->faculty);
        $this->assertEquals('P', $this->user->study_form);
        $this->assertEquals('B', $this->user->study_type);
        $this->assertEquals('7', $this->user->study_type_key);
        $this->assertSame(2, $this->user->study_year);
        $this->assertEquals('S', $this->user->study_status);
        $this->assertEquals('Nováková Jana', $this->user->study_officer_name);
        $this->assertEquals('jana.novakova@upol.cz', $this->user->study_officer_email);
        $this->assertEquals('585 634 000', $this->user->study_officer_phone);
        $this->assertNotNull($this->user->study_info_synced_at);
    }

    public function test_full_token_is_accepted_too(): void
    {
        $fullToken = $this->user->createToken('auth_token')->plainTextToken;

        $this->postAs($fullToken, ['nazevSp' => 'Matematika'])->assertStatus(200);
        $this->assertEquals('Matematika', $this->user->fresh()->study_program);
    }

    public function test_token_without_ability_is_rejected(): void
    {
        $restricted = $this->user->createToken('other', ['something:else'])->plainTextToken;

        $this->postAs($restricted, $this->payload())->assertStatus(403);
        $this->assertNull($this->user->fresh()->study_program);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->postJson('/api/stag/sync-student', $this->payload())->assertStatus(401);
    }

    public function test_only_sent_fields_are_updated(): void
    {
        $token = $this->agentToken();
        $this->postAs($token, $this->payload())->assertStatus(200);

        $this->postAs($token, ['rocnik' => 3, 'studReferentkaTelefon' => null])
            ->assertStatus(200)
            ->assertJson(['updated' => ['study_year', 'study_officer_phone']]);

        $user = $this->user->fresh();
        $this->assertSame(3, $user->study_year);
        $this->assertNull($user->study_officer_phone);
        $this->assertEquals('Aplikovaná informatika', $user->study_program);
        $this->assertEquals('jana.novakova@upol.cz', $user->study_officer_email);
    }

    public function test_sensitive_and_unknown_fields_are_rejected_and_nothing_is_stored(): void
    {
        $data = $this->payload() + [
            'cisloKarty'                => '1234567890',
            'evidovanBankovniUcet'      => 'A',
            'financovani'               => '1',
            'pohlavi'                   => 'Z',
        ];

        $this->postAs($this->agentToken(), $data)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cisloKarty', 'evidovanBankovniUcet', 'financovani', 'pohlavi']);

        $user = $this->user->fresh();
        $this->assertNull($user->study_program);
        $this->assertNull($user->study_info_synced_at);
        $this->assertStringNotContainsString('1234567890', json_encode($user->toArray()));
    }

    public function test_invalid_values_are_rejected(): void
    {
        $this->postAs($this->agentToken(), ['rocnik' => 'druhý', 'nazevSp' => str_repeat('x', 300)])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rocnik', 'nazevSp']);
    }

    public function test_list_payload_is_rejected(): void
    {
        $this->postAs($this->agentToken(), [['nazevSp' => 'X']])->assertStatus(422);
    }

    public function test_study_info_is_part_of_user_json(): void
    {
        $this->postAs($this->agentToken(), $this->payload())->assertStatus(200);

        $fullToken = $this->user->createToken('auth_token')->plainTextToken;
        $this->app['auth']->forgetGuards();
        $this->withToken($fullToken)->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('user.study_program', 'Aplikovaná informatika')
            ->assertJsonPath('user.study_year', 2)
            ->assertJsonPath('user.study_officer_email', 'jana.novakova@upol.cz');
    }
}
