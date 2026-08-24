<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Subject;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    /**
     * Seed schedule events (lectures and labs) for today.
     *
     * Run standalone: php artisan db:seed --class=EventSeeder
     * Sail:          ./vendor/bin/sail artisan db:seed --class=EventSeeder
     */
    public function run(): void
    {
        $today = Carbon::today()->toDateString();

        $subjects = [
            // ── KIV/PIA ──────────────────────────────────────────────────────
            [
                'pattern' => '%/PIA',
                'events' => [
                    [
                        'title'          => 'Přednáška: KIV/PIA',
                        'type'           => 'Lecture',
                        'time'           => '09:15',
                        'end_time'       => '10:45',
                        'room'           => 'UC 115',
                        'teacher_name'   => 'doc. Ing. Jan Novák, Ph.D.',
                        'teacher_email'  => null,
                        'status'         => 'Not Started',
                        'requirement_id' => null,
                    ],
                    [
                        'title'          => 'Cvičení: KIV/PIA',
                        'type'           => 'Lab',
                        'time'           => '11:00',
                        'end_time'       => '12:30',
                        'room'           => 'UL 402',
                        'teacher_name'   => 'doc. Ing. Jan Novák, Ph.D.',
                        'teacher_email'  => null,
                        'status'         => 'Not Started',
                        'requirement_id' => null,
                    ],
                ],
            ],

            // ── KIV/OS ───────────────────────────────────────────────────────
            [
                'pattern' => '%/OS',
                'events' => [
                    [
                        'title'          => 'Přednáška: KIV/OS',
                        'type'           => 'Lecture',
                        'time'           => '14:00',
                        'end_time'       => '15:30',
                        'room'           => 'EP 128',
                        'teacher_name'   => 'Ing. Petr Černý, Ph.D.',
                        'teacher_email'  => null,
                        'status'         => 'Not Started',
                        'requirement_id' => null,
                    ],
                    [
                        'title'          => 'Cvičení: KIV/OS',
                        'type'           => 'Lab',
                        'time'           => '15:45',
                        'end_time'       => '17:15',
                        'room'           => 'UL 301',
                        'teacher_name'   => 'Ing. Petr Černý, Ph.D.',
                        'teacher_email'  => null,
                        'status'         => 'Not Started',
                        'requirement_id' => null,
                    ],
                ],
            ],
        ];

        foreach ($subjects as $subjectDef) {
            $subject = Subject::where('code', 'like', $subjectDef['pattern'])->first();

            if (! $subject) {
                $this->command->warn("Subject matching '{$subjectDef['pattern']}' not found — skipping.");
                continue;
            }

            foreach ($subjectDef['events'] as $evt) {
                Event::updateOrCreate(
                    // Unique klíč: subject_id + title + date
                    [
                        'subject_id' => $subject->id,
                        'title'      => $evt['title'],
                        'date'       => $today,
                    ],
                    array_merge($evt, [
                        'subject_id' => $subject->id,
                        'date'       => $today,
                    ])
                );
            }

            $this->command->info("Seeded events for subject: {$subject->code}");
        }
    }
}
