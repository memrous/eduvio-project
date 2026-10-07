<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Material;
use App\Models\Note;
use App\Models\Requirement;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StagSyncSubjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_sync_subjects(): void
    {
        $response = $this->postJson('/api/stag/sync-subjects', []);
        $response->assertStatus(401);
    }

    public function test_validation_fails_on_invalid_data(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $payload = [
            [
                'code' => '', // required
                'name' => 'Test Subject',
                // credits missing
                'semester' => 'ZS',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['0.code', '0.credits']);
    }

    public function test_sync_subjects_creates_new_subjects_with_fallbacks(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $payload = [
            [
                'code' => 'KIV/PRO',
                'name' => 'Programování',
                'credits' => 5,
                'semester' => 'ZS',
                'department' => 'KIV',
                // completionType, isMandatory, lecturer omitted -> should use fallbacks
            ],
            [
                'code' => 'KIV/DB',
                'name' => 'Databázové systémy',
                'credits' => 6,
                'semester' => 'LS',
                'completionType' => 'Exam',
                'isMandatory' => false,
                'lecturer' => 'Doc. Jan Novák',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Sync successful. 2 subjects processed.',
            ]);

        $this->assertDatabaseHas('subjects', [
            'user_id'         => $user->id,
            'code'            => 'KIV/PRO',
            'name'            => 'Programování',
            'credits'         => 5,
            'semester'        => 'ZS',
            'completion_type' => 'Credit',
            'is_mandatory'    => true,
            'lecturer'        => 'Nespecifikováno',
            'department'      => 'KIV',
            'description'     => 'Imported from IS/STAG',
        ]);

        $this->assertDatabaseHas('subjects', [
            'user_id'         => $user->id,
            'code'            => 'KIV/DB',
            'name'            => 'Databázové systémy',
            'credits'         => 6,
            'semester'        => 'LS',
            'completion_type' => 'Exam',
            'is_mandatory'    => false,
            'lecturer'        => 'Doc. Jan Novák',
            'description'     => 'Imported from IS/STAG',
        ]);
    }

    public function test_resync_updates_fields_without_overwriting_custom_description(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        // Pre-create subject with custom user description
        $subject = Subject::create([
            'user_id'         => $user->id,
            'code'            => 'KIV/PRO',
            'name'            => 'Původní Název',
            'credits'         => 4,
            'semester'        => 'ZS',
            'completion_type' => 'Credit',
            'is_mandatory'    => true,
            'lecturer'        => 'Původní Vyučující',
            'department'      => 'STARA',
            'description'     => 'Moje osobní poznámka k předmětu',
        ]);

        $payload = [
            [
                'code'           => 'KIV/PRO',
                'name'           => 'Aktualizované Programování',
                'credits'        => 5,
                'semester'       => 'ZS',
                'completionType' => 'Exam',
                'isMandatory'    => true,
                'lecturer'       => 'Nový Přednášející',
                'department'     => 'KIV',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Sync successful. 1 subjects processed.',
            ]);

        // Verify updated fields
        $subject->refresh();
        $this->assertEquals('Aktualizované Programování', $subject->name);
        $this->assertEquals(5, $subject->credits);
        $this->assertEquals('Exam', $subject->completion_type);
        $this->assertEquals('Nový Přednášející', $subject->lecturer);
        $this->assertEquals('KIV', $subject->department);

        // Verify description was NOT overwritten
        $this->assertEquals('Moje osobní poznámka k předmětu', $subject->description);

        // Ensure no duplicate subject was created
        $this->assertEquals(1, Subject::where('user_id', $user->id)->where('code', 'KIV/PRO')->count());
    }
    public function test_sync_subjects_saves_statut_and_derives_is_mandatory(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $payload = [
            [
                'code' => 'KMI/A1',
                'name' => 'Povinný Předmět',
                'credits' => 5,
                'semester' => 'ZS',
                'statut' => 'A',
            ],
            [
                'code' => 'KMI/B1',
                'name' => 'Povinně Volitelný Předmět',
                'credits' => 4,
                'semester' => 'ZS',
                'statut' => 'B',
            ],
            [
                'code' => 'KMI/C1',
                'name' => 'Výběrový Předmět',
                'credits' => 2,
                'semester' => 'ZS',
                'statut' => 'C',
            ],
        ];

        $response = $this->postJson('/api/stag/sync-subjects', $payload);
        $response->assertStatus(200);

        $this->assertDatabaseHas('subjects', [
            'user_id' => $user->id,
            'code' => 'KMI/A1',
            'statut' => 'A',
            'is_mandatory' => true,
        ]);

        $this->assertDatabaseHas('subjects', [
            'user_id' => $user->id,
            'code' => 'KMI/B1',
            'statut' => 'B',
            'is_mandatory' => false,
        ]);

        $this->assertDatabaseHas('subjects', [
            'user_id' => $user->id,
            'code' => 'KMI/C1',
            'statut' => 'C',
            'is_mandatory' => false,
        ]);
    }

    private function stagSubject(User $user, string $code, string $semester = 'ZS 2026', array $attrs = []): Subject
    {
        return Subject::create(array_merge([
            'user_id'         => $user->id,
            'code'            => $code,
            'name'            => "Předmět {$code}",
            'credits'         => 5,
            'semester'        => $semester,
            'completion_type' => 'Credit',
            'is_mandatory'    => true,
            'lecturer'        => 'Nespecifikováno',
            'description'     => 'Imported from IS/STAG',
            'source'          => 'stag',
        ], $attrs));
    }

    private function syncPayload(array $codes, string $semester = 'ZS 2026'): array
    {
        return array_map(fn ($code) => [
            'code'     => $code,
            'name'     => "Předmět {$code}",
            'credits'  => 5,
            'semester' => $semester,
        ], $codes);
    }

    public function test_subject_removed_from_stag_without_user_data_is_deleted(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->stagSubject($user, 'KIV/PRO');
        $removed = $this->stagSubject($user, 'KIV/OLD');
        Event::create([
            'subject_id' => $removed->id,
            'title'      => 'Předmět KIV/OLD (Přednáška)',
            'date'       => '2026-10-05',
            'time'       => '08:00',
            'type'       => 'Přednáška',
            'source'     => 'stag',
        ]);
        // Poznámka jen s mezerami se za uživatelská data nepočítá
        Note::create(['subject_id' => $removed->id, 'content' => '   ']);

        $response = $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']));

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'deleted' => 1, 'marked_removed' => 0]);

        $this->assertDatabaseMissing('subjects', ['id' => $removed->id]);
        $this->assertDatabaseMissing('events', ['subject_id' => $removed->id]);
        $this->assertDatabaseHas('subjects', ['user_id' => $user->id, 'code' => 'KIV/PRO']);
    }

    public function test_subject_removed_from_stag_with_note_is_only_marked(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $removed = $this->stagSubject($user, 'KIV/OLD');
        Note::create(['subject_id' => $removed->id, 'content' => 'Moje poznámka']);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 1]);

        $this->assertNotNull($removed->fresh()->stag_removed_at);
        $this->assertDatabaseHas('notes', ['subject_id' => $removed->id]);
    }

    public function test_subject_removed_from_stag_with_manual_requirement_is_only_marked(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $removed = $this->stagSubject($user, 'KIV/OLD');
        Requirement::create(['subject_id' => $removed->id, 'type' => 'homework', 'title' => 'Ruční úkol']);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 1]);

        $this->assertNotNull($removed->fresh()->stag_removed_at);
    }

    public function test_subject_removed_from_stag_with_graded_moodle_requirement_is_only_marked(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $removed = $this->stagSubject($user, 'KIV/OLD');
        Requirement::create([
            'subject_id'           => $removed->id,
            'moodle_assignment_id' => 42,
            'type'                 => 'homework',
            'title'                => 'Úkol z Moodlu',
            'gained_points'        => 8,
        ]);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 1]);

        $this->assertNotNull($removed->fresh()->stag_removed_at);
    }

    public function test_subject_removed_from_stag_with_manual_material_is_only_marked(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $removed = $this->stagSubject($user, 'KIV/OLD');
        Material::create([
            'subject_id' => $removed->id,
            'user_id'    => $user->id,
            'title'      => 'Moje skripta',
            'type'       => 'PDF',
            'url'        => 'https://example.com/skripta.pdf',
        ]);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 1]);

        $this->assertNotNull($removed->fresh()->stag_removed_at);
    }

    public function test_subject_removed_from_stag_with_only_moodle_data_is_deleted(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $removed = $this->stagSubject($user, 'KIV/OLD');
        Requirement::create([
            'subject_id'           => $removed->id,
            'moodle_assignment_id' => 42,
            'type'                 => 'homework',
            'title'                => 'Úkol z Moodlu',
        ]);
        Material::create([
            'subject_id'  => $removed->id,
            'user_id'     => $user->id,
            'title'       => 'Soubor z Moodlu',
            'type'        => 'LINK',
            'url'         => 'https://moodle.example.com/mod/resource/view.php?id=7',
            'category'    => 'platform',
            'moodle_cmid' => 7,
        ]);
        Material::create([
            'subject_id'        => $removed->id,
            'user_id'           => $user->id,
            'title'             => 'Zamčená sekce',
            'type'              => 'LINK',
            'url'               => 'https://moodle.example.com/course/view.php?id=1#section-2',
            'category'          => 'platform',
            'moodle_section_id' => 2,
        ]);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))
            ->assertStatus(200)
            ->assertJson(['deleted' => 1, 'marked_removed' => 0]);

        $this->assertDatabaseMissing('subjects', ['id' => $removed->id]);
        $this->assertDatabaseMissing('requirements', ['subject_id' => $removed->id]);
        $this->assertDatabaseMissing('resources', ['subject_id' => $removed->id]);
    }

    public function test_manually_created_subject_is_never_removed(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/subjects', [
            'code'     => 'MY/OWN',
            'name'     => 'Vlastní předmět',
            'credits'  => 3,
            'lecturer' => 'Já',
            'semester' => 'ZS 2026',
        ])->assertStatus(201)->assertJson(['source' => 'manual', 'stag_removed_at' => null]);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 0]);

        $this->assertDatabaseHas('subjects', [
            'user_id'         => $user->id,
            'code'            => 'MY/OWN',
            'source'          => 'manual',
            'stag_removed_at' => null,
        ]);
    }

    public function test_subject_from_other_semester_is_kept(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $old = $this->stagSubject($user, 'KIV/OLD', 'LS 2026');

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO'], 'ZS 2026'))
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 0]);

        $this->assertDatabaseHas('subjects', ['id' => $old->id, 'stag_removed_at' => null]);
    }

    public function test_empty_subject_list_removes_nothing(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $subject = $this->stagSubject($user, 'KIV/OLD');

        $this->postJson('/api/stag/sync-subjects', [])
            ->assertStatus(200)
            ->assertJson(['deleted' => 0, 'marked_removed' => 0]);

        $this->assertDatabaseHas('subjects', ['id' => $subject->id, 'stag_removed_at' => null]);
    }

    public function test_subject_returning_to_stag_is_unmarked(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $subject = $this->stagSubject($user, 'KIV/OLD', 'ZS 2026', ['stag_removed_at' => now()->subDay()]);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/OLD']))
            ->assertStatus(200);

        $subject->refresh();
        $this->assertNull($subject->stag_removed_at);
        $this->assertEquals('stag', $subject->source);
    }

    public function test_synced_subject_json_contains_source_and_removal_flag(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KIV/PRO']))->assertStatus(200);

        $this->getJson('/api/subjects')
            ->assertStatus(200)
            ->assertJsonPath('0.source', 'stag')
            ->assertJsonPath('0.stag_removed_at', null);
    }

    private function detailedItem(array $overrides = []): array
    {
        return array_merge([
            'code'                => 'KMI/MR',
            'name'                => 'Matematické repetitorium',
            'credits'             => 3,
            'semester'            => 'ZS 2026',
            'completionType'      => 'Credit + Exam',
            'lecturer'            => 'prof. RNDr. Josef Molnár, CSc.',
            'guarantor'           => 'prof. RNDr. Josef Molnár, CSc.',
            'lecturers'           => 'prof. RNDr. Josef Molnár, CSc.',
            'tutors'              => 'Mgr. Jakub Baloun, RNDr. Marie Chodorová, Ph.D.',
            'stagAnnotation'      => "Doplnění středoškolské matematiky.\n\nDruhý odstavec.",
            'stagRequirements'    => 'Zápočtová písemka.',
            'stagSyllabus'        => "1. výrazy\n2. funkce",
            'stagLiterature'      => "Kubát J.: Diferenciální počet.\nCalda E.: Matematika pro gymnázia.",
            'stagAssessment'      => 'Didaktický test',
            'examForm'            => 'Kombinovaná',
            'creditBeforeExam'    => true,
            'stagUrl'             => 'https://stag.example/predmet/KMI/MR',
            'stagCompletionState' => 'S',
            'creditResult'        => 'S',
            'creditDate'          => '2026-12-18',
            'creditAttempt'       => 1,
            'creditExaminer'      => 'Mgr. Jakub Baloun',
            'examResult'          => '2',
            'examDate'            => '2027-01-20',
            'examAttempt'         => 1,
            'examPoints'          => 78.5,
            'examExaminer'        => 'prof. RNDr. Josef Molnár, CSc.',
        ], $overrides);
    }

    public function test_sync_subjects_stores_stag_details(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-subjects', [$this->detailedItem()])->assertStatus(200);

        $subject = Subject::where('user_id', $user->id)->where('code', 'KMI/MR')->firstOrFail();
        $this->assertEquals('prof. RNDr. Josef Molnár, CSc.', $subject->guarantor);
        $this->assertEquals('prof. RNDr. Josef Molnár, CSc.', $subject->lecturers);
        $this->assertEquals('Mgr. Jakub Baloun, RNDr. Marie Chodorová, Ph.D.', $subject->tutors);
        $this->assertEquals("Doplnění středoškolské matematiky.\n\nDruhý odstavec.", $subject->stag_annotation);
        $this->assertEquals('Zápočtová písemka.', $subject->stag_requirements);
        $this->assertEquals("1. výrazy\n2. funkce", $subject->stag_syllabus);
        $this->assertStringContainsString('Calda E.', $subject->stag_literature);
        $this->assertEquals('Didaktický test', $subject->stag_assessment);
        $this->assertEquals('Kombinovaná', $subject->exam_form);
        $this->assertTrue($subject->credit_before_exam);
        $this->assertEquals('https://stag.example/predmet/KMI/MR', $subject->stag_url);
        $this->assertEquals('S', $subject->stag_completion_state);
        $this->assertEquals('S', $subject->credit_result);
        $this->assertEquals('2026-12-18', $subject->credit_date->format('Y-m-d'));
        $this->assertSame(1, $subject->credit_attempt);
        $this->assertEquals('Mgr. Jakub Baloun', $subject->credit_examiner);
        $this->assertEquals('2', $subject->exam_result);
        $this->assertEquals('2027-01-20', $subject->exam_date->format('Y-m-d'));
        $this->assertSame(1, $subject->exam_attempt);
        $this->assertEquals(78.5, $subject->exam_points);
        $this->assertEquals('prof. RNDr. Josef Molnár, CSc.', $subject->exam_examiner);
        $this->assertEquals('Imported from IS/STAG', $subject->description);

        $this->getJson("/api/subjects/{$subject->id}")
            ->assertStatus(200)
            ->assertJsonPath('exam_date', '2027-01-20')
            ->assertJsonPath('credit_before_exam', true)
            ->assertJsonPath('finalGrade', '2');
    }

    public function test_missing_keys_keep_existing_values_and_explicit_null_clears(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-subjects', [$this->detailedItem()])->assertStatus(200);

        // Info o předmětu se nepodařilo načíst: klíče chybí. Anotace přišla explicitně jako null.
        $this->postJson('/api/stag/sync-subjects', [[
            'code'           => 'KMI/MR',
            'name'           => 'Matematické repetitorium',
            'credits'        => 3,
            'semester'       => 'ZS 2026',
            'stagAnnotation' => null,
        ]])->assertStatus(200);

        $subject = Subject::where('user_id', $user->id)->where('code', 'KMI/MR')->firstOrFail();
        $this->assertNull($subject->stag_annotation);
        $this->assertEquals('prof. RNDr. Josef Molnár, CSc.', $subject->lecturer);
        $this->assertEquals('Mgr. Jakub Baloun, RNDr. Marie Chodorová, Ph.D.', $subject->tutors);
        $this->assertEquals('Zápočtová písemka.', $subject->stag_requirements);
        $this->assertEquals('Credit + Exam', $subject->completion_type);
        $this->assertEquals('2', $subject->exam_result);
        $this->assertEquals('2', $subject->final_grade);
        $this->assertEquals('completed', $subject->status);
    }

    public function test_sync_subjects_rejects_invalid_detail_values(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-subjects', [$this->detailedItem([
            'examDate'         => '20.1.2027',
            'creditAttempt'    => 'first',
            'creditBeforeExam' => 'maybe',
        ])])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['0.examDate', '0.creditAttempt', '0.creditBeforeExam']);
    }

    #[DataProvider('completionTypeProvider')]
    public function test_completion_type_is_mapped_to_frontend_values(?string $incoming, string $expected): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-subjects', [[
            'code' => 'KMI/X', 'name' => 'X', 'credits' => 3, 'semester' => 'ZS 2026', 'completionType' => $incoming,
        ]])->assertStatus(200);

        $this->assertDatabaseHas('subjects', ['code' => 'KMI/X', 'completion_type' => $expected]);
    }

    public static function completionTypeProvider(): array
    {
        return [
            'frontend value'          => ['Credit + Exam', 'Credit + Exam'],
            'STAG Zk'                 => ['Zk', 'Exam'],
            'STAG Zkouška'            => ['Zkouška', 'Exam'],
            'STAG Zp'                 => ['Zp', 'Credit'],
            'STAG Zápočet'            => ['Zápočet', 'Credit'],
            'classified credit'       => ['Klasifikovaný zápočet', 'Credit'],
            'colloquium'              => ['Kolokvium', 'Credit'],
            'credit and exam'         => ['Zp+Zk', 'Credit + Exam'],
            'unknown on new subject'  => ['Něco jiného', 'Credit'],
            'null on new subject'     => [null, 'Credit'],
        ];
    }

    public function test_unknown_completion_type_keeps_existing_value(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);
        $this->stagSubject($user, 'KMI/X', 'ZS 2026', ['completion_type' => 'Exam']);

        $this->postJson('/api/stag/sync-subjects', [[
            'code' => 'KMI/X', 'name' => 'X', 'credits' => 3, 'semester' => 'ZS 2026', 'completionType' => 'Něco jiného',
        ]])->assertStatus(200);

        $this->assertDatabaseHas('subjects', ['code' => 'KMI/X', 'completion_type' => 'Exam']);
    }

    #[DataProvider('resultProvider')]
    public function test_results_map_to_final_grade_and_status(
        string $completionType,
        ?string $creditResult,
        ?string $examResult,
        ?string $expectedGrade,
        string $expectedStatus,
    ): void {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/stag/sync-subjects', [[
            'code' => 'KMI/R', 'name' => 'R', 'credits' => 3, 'semester' => 'ZS 2026',
            'completionType' => $completionType,
            'creditResult'   => $creditResult,
            'examResult'     => $examResult,
        ]])->assertStatus(200);

        $subject = Subject::where('user_id', $user->id)->where('code', 'KMI/R')->firstOrFail();
        $this->assertSame($expectedGrade, $subject->final_grade);
        $this->assertSame($expectedStatus, $subject->status);
    }

    public static function resultProvider(): array
    {
        return [
            'exam passed'                     => ['Credit + Exam', 'S', '1', '1', 'completed'],
            'exam passed ECTS'                => ['Exam', null, 'B', 'B', 'completed'],
            'exam failed'                     => ['Credit + Exam', 'S', '4', '4', 'failed'],
            'only credit, exam pending'       => ['Credit + Exam', 'S', null, null, 'in_progress'],
            'credit-only passed'              => ['Credit', 'S', null, null, 'completed'],
            'credit-only započteno'           => ['Credit', 'Započteno', null, null, 'completed'],
            'credit-only failed'              => ['Credit', 'N', null, null, 'failed'],
            'classified credit with grade'    => ['Credit', '2', null, '2', 'completed'],
            'no results yet'                  => ['Credit + Exam', null, '', null, 'in_progress'],
            'unknown exam value keeps status' => ['Exam', null, 'Nedostavil se', 'Nedostavil se', 'in_progress'],
        ];
    }

    public function test_result_cleared_in_stag_resets_grade(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);
        $this->stagSubject($user, 'KMI/R', 'ZS 2026', ['final_grade' => '1', 'status' => 'completed']);

        $this->postJson('/api/stag/sync-subjects', [[
            'code' => 'KMI/R', 'name' => 'R', 'credits' => 3, 'semester' => 'ZS 2026',
            'creditResult' => null, 'examResult' => null,
        ]])->assertStatus(200);

        $this->assertDatabaseHas('subjects', ['code' => 'KMI/R', 'final_grade' => null, 'status' => 'in_progress']);
    }

    public function test_grade_is_kept_when_results_were_not_sent(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);
        $this->stagSubject($user, 'KMI/R', 'ZS 2026', ['final_grade' => '1', 'status' => 'completed']);

        $this->postJson('/api/stag/sync-subjects', $this->syncPayload(['KMI/R']))->assertStatus(200);

        $this->assertDatabaseHas('subjects', ['code' => 'KMI/R', 'final_grade' => '1', 'status' => 'completed']);
    }
}
