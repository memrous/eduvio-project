<?php

namespace Database\Seeders;

use App\Models\Requirement;
use App\Models\Subject;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RequirementSeeder extends Seeder
{
    /**
     * Seed realistic Requirement records for each subject.
     *
     * IMPORTANT: This seeder depends on subjects already existing in the database.
     * Run it AFTER a STAG sync (test_import.py) has populated the subjects table,
     * or after any other subject seeder. Subjects are looked up by code suffix
     * (e.g. '%/PIA'), so the STAG-imported codes like "KIV/PIA" will match.
     *
     * Run standalone:  php artisan db:seed --class=RequirementSeeder
     */
    public function run(): void
    {
        $today = Carbon::today();

        // ─────────────────────────────────────────────────────────────────────
        // Subject definitions: code LIKE pattern + per-subject requirements.
        // For subjects where we want the average to fall below 50% we set
        // gained_points lower on completed items.
        // ─────────────────────────────────────────────────────────────────────
        $subjects = [

            // ── KIV/PIA ──────────────────────────────────────────────────────
            [
                'pattern' => '%/PIA',
                'requirements' => [
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 1: Základy jazyka C',
                        'due_date'      => $today->copy()->subDays(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => true,
                        'max_points'    => 10,
                        'gained_points' => 10,  // 100% → above threshold
                        'weight'        => 10,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'test',
                        'title'         => 'Test: Pole a řetězce',
                        'due_date'      => $today->copy()->addDays(3)->toDateString(),
                        'due_time'      => '09:00',
                        'completed'     => false,
                        'max_points'    => 20,
                        'gained_points' => null,
                        'weight'        => 20,
                        'context'       => 'Průběžný test v přednáškové místnosti',
                    ],
                    [
                        'type'          => 'homework',
                        'title'         => 'Cvičení 1: Návrh REST API a JSON schématu',
                        'due_date'      => $today->copy()->toDateString(),
                        'due_time'      => '16:00',
                        'completed'     => false,
                        'max_points'    => 10,
                        'gained_points' => null,
                        'weight'        => 10,
                        'context'       => 'Moodle odevzdání z cvičení PIA',
                    ],
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 3: Vícerozměrná pole',
                        'due_date'      => $today->copy()->addDays(6)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 15,
                        'gained_points' => null,
                        'weight'        => 15,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'project',
                        'title'         => 'Semestrální projekt: Textová hra v C',
                        'due_date'      => $today->copy()->addWeeks(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 25,
                        'gained_points' => null,
                        'weight'        => 25,
                        'context'       => 'Odevzdání přes GitLab',
                    ],
                    [
                        'type'          => 'exam',
                        'title'         => 'Závěrečná zkouška',
                        'due_date'      => $today->copy()->addWeeks(10)->toDateString(),
                        'due_time'      => null,
                        'completed'     => false,
                        'max_points'    => 30,
                        'gained_points' => null,
                        'weight'        => 30,
                        'context'       => 'Zkouškové období — termíny v IS',
                    ],
                    [
                        'type'          => 'activity',
                        'title'         => 'Povinná docházka a cvičení',
                        'due_date'      => null,
                        'due_time'      => null,
                        'completed'     => true,
                        'max_points'    => null,
                        'gained_points' => null,
                        'grade'         => null,
                        'weight'        => null,
                        'context'       => 'Moodle Checklist docházky',
                    ],
                ],
            ],

            // ── KIV/OS ───────────────────────────────────────────────────────
            // Intentionally low score on completed item → avg < 50 % (3/10 = 30%)
            [
                'pattern' => '%/OS',
                'requirements' => [
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 1: Procesy a fork()',
                        'due_date'      => $today->copy()->subDays(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => true,
                        'max_points'    => 10,
                        'gained_points' => 3,   // 30% — triggers low-score alert
                        'weight'        => 10,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'test',
                        'title'         => 'Přednáškový kvíz: Virtuální paměť a stránkování',
                        'due_date'      => $today->copy()->toDateString(),
                        'due_time'      => '11:00',
                        'completed'     => false,
                        'max_points'    => 10,
                        'gained_points' => null,
                        'weight'        => 10,
                        'context'       => 'Moodle Kvíz z přednášky OS',
                    ],
                    [
                        'type'          => 'test',
                        'title'         => 'Průběžný test: Vlákna a synchronizace',
                        'due_date'      => $today->copy()->addDays(3)->toDateString(),
                        'due_time'      => '14:00',
                        'completed'     => false,
                        'max_points'    => 20,
                        'gained_points' => null,
                        'weight'        => 20,
                        'context'       => 'Psán v průběhu cvičení',
                    ],
                    [
                        'type'          => 'homework',
                        'title'         => 'Krátká úloha: Analýza plánování CPU',
                        'due_date'      => $today->copy()->toDateString(),
                        'due_time'      => '18:00',
                        'completed'     => false,
                        'max_points'    => 5,
                        'gained_points' => null,
                        'weight'        => 5,
                        'context'       => 'Moodle blesková odevzdávárna',
                    ],
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 2: Sdílená paměť a semafory',
                        'due_date'      => $today->copy()->addDays(6)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 15,
                        'gained_points' => null,
                        'weight'        => 15,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'project',
                        'title'         => 'Semestrální projekt: Minishell',
                        'due_date'      => $today->copy()->addWeeks(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 25,
                        'gained_points' => null,
                        'weight'        => 25,
                        'context'       => 'Implementace v C s použitím POSIX API',
                    ],
                    [
                        'type'          => 'exam',
                        'title'         => 'Závěrečná zkouška',
                        'due_date'      => $today->copy()->addWeeks(10)->toDateString(),
                        'due_time'      => null,
                        'completed'     => false,
                        'max_points'    => 30,
                        'gained_points' => null,
                        'weight'        => 30,
                        'context'       => 'Zkouškové období',
                    ],
                ],
            ],

            // ── KIV/LIN ──────────────────────────────────────────────────────
            [
                'pattern' => '%/LIN',
                'requirements' => [
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 1: Vektory a lineární kombinace',
                        'due_date'      => $today->copy()->subDays(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => true,
                        'max_points'    => 10,
                        'gained_points' => 9,   // 90%
                        'weight'        => 10,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'test',
                        'title'         => 'Kvíz: Soustavy lineárních rovnic',
                        'due_date'      => $today->copy()->addDays(3)->toDateString(),
                        'due_time'      => '13:00',
                        'completed'     => false,
                        'max_points'    => 20,
                        'gained_points' => null,
                        'weight'        => 20,
                        'context'       => 'Krátký kvíz na začátku cvičení',
                    ],
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 2: Vlastní čísla a vektory',
                        'due_date'      => $today->copy()->addDays(6)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 15,
                        'gained_points' => null,
                        'weight'        => 15,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'project',
                        'title'         => 'Projekt: Analýza datasetu metodou PCA',
                        'due_date'      => $today->copy()->addWeeks(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 25,
                        'gained_points' => null,
                        'weight'        => 25,
                        'context'       => 'Implementace v Pythonu nebo MATLABu',
                    ],
                    [
                        'type'          => 'exam',
                        'title'         => 'Závěrečná zkouška',
                        'due_date'      => $today->copy()->addWeeks(10)->toDateString(),
                        'due_time'      => null,
                        'completed'     => false,
                        'max_points'    => 30,
                        'gained_points' => null,
                        'weight'        => 30,
                        'context'       => 'Zkouškové období',
                    ],
                ],
            ],

            // ── KIV/DB2 ──────────────────────────────────────────────────────
            // Intentionally low score on completed item → avg < 50 % (4/10 = 40%)
            [
                'pattern' => '%/DB2',
                'requirements' => [
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 1: Návrh E-R diagramu',
                        'due_date'      => $today->copy()->subDays(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => true,
                        'max_points'    => 10,
                        'gained_points' => 4,   // 40% — triggers low-score alert
                        'weight'        => 10,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'test',
                        'title'         => 'Průběžný test: SQL dotazy a JOINy',
                        'due_date'      => $today->copy()->addDays(3)->toDateString(),
                        'due_time'      => '11:00',
                        'completed'     => false,
                        'max_points'    => 20,
                        'gained_points' => null,
                        'weight'        => 20,
                        'context'       => 'Psán v průběhu přednášky',
                    ],
                    [
                        'type'          => 'homework',
                        'title'         => 'Domácí úloha 2: Transakce a indexy',
                        'due_date'      => $today->copy()->addDays(6)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 15,
                        'gained_points' => null,
                        'weight'        => 15,
                        'context'       => null,
                    ],
                    [
                        'type'          => 'project',
                        'title'         => 'Semestrální projekt: Databáze pro e-shop',
                        'due_date'      => $today->copy()->addWeeks(5)->toDateString(),
                        'due_time'      => '23:59',
                        'completed'     => false,
                        'max_points'    => 25,
                        'gained_points' => null,
                        'weight'        => 25,
                        'context'       => 'PostgreSQL + dokumentace datového modelu',
                    ],
                    [
                        'type'          => 'exam',
                        'title'         => 'Závěrečná zkouška',
                        'due_date'      => $today->copy()->addWeeks(10)->toDateString(),
                        'due_time'      => null,
                        'completed'     => false,
                        'max_points'    => 30,
                        'gained_points' => null,
                        'weight'        => 30,
                        'context'       => 'Zkouškové období',
                    ],
                ],
            ],
        ];

        // ─────────────────────────────────────────────────────────────────────
        // Insert records — skip gracefully if the subject doesn't exist yet.
        // ─────────────────────────────────────────────────────────────────────
        foreach ($subjects as $subjectDef) {
            $subject = Subject::where('code', 'like', $subjectDef['pattern'])->first();

            if (! $subject) {
                $this->command->warn("Subject matching '{$subjectDef['pattern']}' not found — skipping.");
                continue;
            }

            foreach ($subjectDef['requirements'] as $req) {
                Requirement::updateOrCreate(
                    // Unique key: subject + title (avoid duplicates on re-seed)
                    [
                        'subject_id' => $subject->id,
                        'title'      => $req['title'],
                    ],
                    array_merge($req, ['subject_id' => $subject->id])
                );
            }

            $this->command->info("Seeded requirements for subject: {$subject->code}");
        }
    }
}
