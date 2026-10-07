<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StagController extends Controller
{
    /** Klíč v payloadu sync-subjects => sloupec v subjects */
    private const STAG_DETAIL_FIELDS = [
        'guarantor'           => 'guarantor',
        'lecturers'           => 'lecturers',
        'tutors'              => 'tutors',
        'stagAnnotation'      => 'stag_annotation',
        'stagRequirements'    => 'stag_requirements',
        'stagSyllabus'        => 'stag_syllabus',
        'stagLiterature'      => 'stag_literature',
        'stagAssessment'      => 'stag_assessment',
        'examForm'            => 'exam_form',
        'creditBeforeExam'    => 'credit_before_exam',
        'stagUrl'             => 'stag_url',
        'stagCompletionState' => 'stag_completion_state',
        'creditResult'        => 'credit_result',
        'creditDate'          => 'credit_date',
        'creditAttempt'       => 'credit_attempt',
        'creditExaminer'      => 'credit_examiner',
        'examResult'          => 'exam_result',
        'examDate'            => 'exam_date',
        'examAttempt'         => 'exam_attempt',
        'examPoints'          => 'exam_points',
        'examExaminer'        => 'exam_examiner',
    ];

    // Hodnocení ze STAGu (velká písmena bez diakritiky)
    private const GRADES = ['1', '1,5', '1.5', '2', '2,5', '2.5', '3', '4', 'A', 'B', 'C', 'D', 'E', 'F'];
    private const PASSING_RESULTS = [
        '1', '1,5', '1.5', '2', '2,5', '2.5', '3', 'A', 'B', 'C', 'D', 'E',
        'S', 'Z', 'ZAP', 'ZAPOCTENO', 'SPLNENO', 'SPLNIL', 'USPEL', 'VYHOVEL', 'ANO',
        'VYBORNE', 'VELMI DOBRE', 'DOBRE',
    ];
    private const FAILING_RESULTS = [
        '4', 'F', 'N', 'NEZAPOCTENO', 'NESPLNENO', 'NESPLNIL', 'NEUSPEL', 'NEVYHOVEL', 'NE', 'NEDOSTATECNE',
    ];

    /**
     * POST /api/stag/sync-schedule
     * Přijme transformovaná data z Pythonu a synchronizuje rozvrh.
     */
    public function syncSchedule(Request $request)
    {
        // 1. Validace příchozí struktury polí
        $validated = $request->validate([
            '*.subject.code' => 'required|string|max:255',
            '*.subject.name' => 'required|string|max:255',
            '*.subject.credits' => 'required|integer',
            '*.subject.lecturer' => 'required|string|max:255',
            '*.subject.department' => 'nullable|string|max:255',
            '*.subject.semester' => 'required|string|max:255',
            '*.subject.completionType' => 'nullable|string|max:255',
            '*.subject.isMandatory' => 'nullable|boolean',
            '*.subject.statut' => 'nullable|string|in:A,B,C,a,b,c',
            '*.event.title' => 'required|string|max:255',
            '*.event.date' => 'required|date_format:Y-m-d',
            '*.event.startTime' => 'required|string',
            '*.event.endTime' => 'nullable|string',
            '*.event.type' => 'required|string|max:255',
            '*.event.status' => 'nullable|string|max:255',
            '*.event.room' => 'nullable|string|max:255',
            '*.event.teacherName' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $importedCount = 0;
        $updatedCount = 0;
        $deletedCount = 0;

        // Vše zabalíme do DB transakce, kdyby uprostřed nastala chyba, nic se neuloží napůl
        DB::transaction(function () use ($request, $user, &$importedCount, &$updatedCount, &$deletedCount) {
            // Klíče (datum + čas začátku) akcí, které v datech přišly, podle předmětu
            $seenKeys = [];

            foreach ($request->all() as $item) {
                $subjectData = $item['subject'];
                $eventData = $item['event'];

                // 2. Ošetření duplicity předmětů (FirstOrCreate)
                // Hledáme předmět podle 'code' pro konkrétního uživatele
                $subject = Subject::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'code' => $subjectData['code']
                    ],
                    [
                        'name' => $subjectData['name'],
                        'credits' => $subjectData['credits'],
                        'lecturer' => $subjectData['lecturer'],
                        'department' => $subjectData['department'] ?? null,
                        'semester' => $subjectData['semester'],
                        'completion_type' => $subjectData['completionType'] ?? 'Credit',
                        'statut' => !empty($subjectData['statut']) ? strtoupper($subjectData['statut']) : null,
                        'is_mandatory' => !empty($subjectData['statut'])
                            ? (strtoupper($subjectData['statut']) === 'A')
                            : ($subjectData['isMandatory'] ?? true),
                        'description' => 'Imported from IS/STAG',
                        'source' => 'stag',
                    ]
                );

                // Předmět je ve STAGu, takže ho vedeme jako STAG předmět a případně odznačíme
                $subject->source = 'stag';
                $subject->stag_removed_at = null;

                if (!empty($subjectData['lecturer']) && $subjectData['lecturer'] !== 'Nespecifikováno') {
                    $subject->lecturer = $subjectData['lecturer'];
                }

                if (!empty($subjectData['department'])) {
                    $subject->department = $subjectData['department'];
                }

                if (!empty($subjectData['statut'])) {
                    $newStatut = strtoupper($subjectData['statut']);
                    $subject->statut = $newStatut;
                    $subject->is_mandatory = ($newStatut === 'A');
                }

                if ($subject->isDirty()) {
                    $subject->save();
                }

                $seenKeys[$subject->id][$this->eventKey($eventData['date'], $eventData['startTime'])] = true;

                // 3. Kontrola duplicity rozvrhové akce (Event) podle data a času začátku.
                // Shodnou STAG akci aktualizujeme, ruční akci necháme být.
                $existing = Event::where('subject_id', $subject->id)
                    ->where('date', $eventData['date'])
                    ->where('time', $eventData['startTime'])
                    ->orderByRaw("CASE WHEN source = 'stag' THEN 0 ELSE 1 END")
                    ->first();

                if ($existing === null) {
                    $event = new Event();
                    $event->subject_id = $subject->id;
                    $event->title = $eventData['title'];
                    $event->date = $eventData['date'];
                    $event->time = $eventData['startTime'];
                    $event->end_time = $eventData['endTime'] ?? null;
                    $event->type = $eventData['type'];
                    $event->status = $eventData['status'] ?? 'Not Started';
                    $event->room = $eventData['room'] ?? null;
                    $event->teacher_name = $eventData['teacherName'] ?? null;
                    $event->source = 'stag';
                    $event->save();

                    $importedCount++;
                } elseif ($existing->source === 'stag') {
                    // Status si nastavuje uživatel, ten nepřepisujeme
                    $existing->title = $eventData['title'];
                    $existing->end_time = $eventData['endTime'] ?? null;
                    $existing->type = $eventData['type'];
                    $existing->room = $eventData['room'] ?? null;
                    $existing->teacher_name = $eventData['teacherName'] ?? null;

                    if ($existing->isDirty()) {
                        $existing->save();
                        $updatedCount++;
                    }
                }
            }

            // 4. STAG akce předmětů z dat, které v datech nepřišly, smažeme (např. změna času).
            // Prázdný seznam sem nic nepřinese, takže se nic nesmaže.
            foreach ($seenKeys as $subjectId => $keys) {
                $staleIds = Event::where('subject_id', $subjectId)
                    ->where('source', 'stag')
                    ->get(['id', 'date', 'time'])
                    ->reject(fn (Event $event) => isset($keys[$this->eventKey($event->date, $event->time)]))
                    ->pluck('id');

                if ($staleIds->isNotEmpty()) {
                    $deletedCount += Event::whereIn('id', $staleIds)->delete();
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Sync successful. {$importedCount} new schedule events were created.",
            'updated' => $updatedCount,
            'deleted' => $deletedCount,
        ], 200);
    }

    /**
     * POST /api/stag/sync-subjects
     * Přijme pole předmětů a synchronizuje je (updateOrCreate).
     */
    public function syncSubjects(Request $request)
    {
        $request->validate([
            '*.code'           => 'required|string|max:255',
            '*.name'           => 'required|string|max:255',
            '*.credits'        => 'required|integer',
            '*.semester'       => 'required|string|max:255',
            '*.completionType' => 'nullable|string|max:255',
            '*.isMandatory'    => 'nullable|boolean',
            '*.statut'         => 'nullable|string|in:A,B,C,a,b,c',
            '*.lecturer'       => 'nullable|string|max:255',
            '*.department'     => 'nullable|string|max:255',
            // Podrobnosti ze STAGu (getPredmetInfo, getZnamkyByStudent)
            '*.guarantor'           => 'nullable|string|max:255',
            '*.lecturers'           => 'nullable|string',
            '*.tutors'              => 'nullable|string',
            '*.stagAnnotation'      => 'nullable|string',
            '*.stagRequirements'    => 'nullable|string',
            '*.stagSyllabus'        => 'nullable|string',
            '*.stagLiterature'      => 'nullable|string',
            '*.stagAssessment'      => 'nullable|string',
            '*.examForm'            => 'nullable|string|max:255',
            '*.creditBeforeExam'    => 'nullable|boolean',
            '*.stagUrl'             => 'nullable|string|max:255',
            '*.stagCompletionState' => 'nullable|string|max:255',
            '*.creditResult'        => 'nullable|string|max:255',
            '*.creditDate'          => 'nullable|date_format:Y-m-d',
            '*.creditAttempt'       => 'nullable|integer|min:0|max:32767',
            '*.creditExaminer'      => 'nullable|string|max:255',
            '*.examResult'          => 'nullable|string|max:255',
            '*.examDate'            => 'nullable|date_format:Y-m-d',
            '*.examAttempt'         => 'nullable|integer|min:0|max:32767',
            '*.examPoints'          => 'nullable|numeric|min:0|max:9999.99',
            '*.examExaminer'        => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $items = $request->all();
        $processedCount = 0;
        $deletedCount = 0;
        $markedRemovedCount = 0;

        DB::transaction(function () use ($items, $user, &$processedCount, &$deletedCount, &$markedRemovedCount) {
            foreach ($items as $item) {
                $subject = Subject::firstOrNew(
                    [
                        'user_id' => $user->id,
                        'code'    => $item['code'],
                    ],
                    [
                        'description' => 'Imported from IS/STAG',
                    ]
                );

                $subject->name            = $item['name'];
                $subject->credits         = $item['credits'];
                $subject->semester        = $item['semester'];
                // Neznámý nebo chybějící typ zakončení nepřepisuje existující hodnotu
                $completionType = $this->mapCompletionType($item['completionType'] ?? null);
                if ($completionType !== null) {
                    $subject->completion_type = $completionType;
                } elseif (!$subject->exists) {
                    $subject->completion_type = 'Credit';
                }
                $statutVal = !empty($item['statut']) ? strtoupper($item['statut']) : null;
                $subject->statut          = $statutVal;
                $subject->is_mandatory    = $statutVal !== null
                    ? ($statutVal === 'A')
                    : ($item['isMandatory'] ?? true);
                // Bez info o předmětu agent vyučujícího nepošle; existující hodnotu necháme
                if (array_key_exists('lecturer', $item) || !$subject->exists) {
                    $subject->lecturer = $item['lecturer'] ?? 'Nespecifikováno';
                }
                $subject->department      = $item['department'] ?? null;
                $subject->source          = 'stag';
                $subject->stag_removed_at = null;

                // Chybějící klíč = nesahat na existující hodnotu, explicitní null = vynulovat
                foreach (self::STAG_DETAIL_FIELDS as $key => $column) {
                    if (array_key_exists($key, $item)) {
                        $subject->{$column} = $item[$key];
                    }
                }

                if (array_key_exists('examResult', $item) || array_key_exists('creditResult', $item)) {
                    $this->applyStagResult($subject);
                }

                $subject->save();
                $processedCount++;
            }

            // Prázdný seznam může znamenat chybu STAGu, v tom případě nic nemažeme
            if (empty($items)) {
                return;
            }

            // Předměty, které ze STAGu zmizely (jen semestry, které v datech přišly)
            $removed = Subject::where('user_id', $user->id)
                ->where('source', 'stag')
                ->whereIn('semester', array_unique(array_column($items, 'semester')))
                ->whereNotIn('code', array_column($items, 'code'))
                ->get();

            $toDelete = [];
            foreach ($removed as $subject) {
                if (!$this->hasUserData($subject)) {
                    $toDelete[] = $subject->id;
                } elseif ($subject->stag_removed_at === null) {
                    $subject->stag_removed_at = now();
                    $subject->save();
                    $markedRemovedCount++;
                }
            }

            if (!empty($toDelete)) {
                // Events, requirements, materiály a poznámky smaže kaskáda v DB
                $deletedCount = Subject::whereIn('id', $toDelete)->delete();
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Sync successful. {$processedCount} subjects processed.",
            'deleted' => $deletedCount,
            'marked_removed' => $markedRemovedCount,
        ], 200);
    }

    /**
     * Má předmět data, která zadal uživatel? Data importovaná z Moodlu se
     * nepočítají, Moodle sync je po případném smazání obnoví.
     */
    private function hasUserData(Subject $subject): bool
    {
        $noteContent = $subject->note()->value('content');
        if ($noteContent !== null && trim($noteContent) !== '') {
            return true;
        }

        $hasUserRequirement = $subject->requirements()
            ->where(function ($q) {
                $q->whereNull('moodle_assignment_id')
                    ->orWhereNotNull('gained_points')
                    ->orWhereNotNull('grade');
            })
            ->exists();
        if ($hasUserRequirement) {
            return true;
        }

        return $subject->materials()
            ->whereNull('moodle_cmid')
            ->whereNull('moodle_section_id')
            ->exists();
    }

    /**
     * Typ zakončení ze STAGu (typZk / typZkousky, zkratky i celé názvy) na hodnoty,
     * které zná frontend: 'Credit', 'Exam', 'Credit + Exam'. Neznámá hodnota → null.
     */
    private function mapCompletionType(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $tokens = preg_split('/[^a-z]+/', strtolower(Str::ascii($value)), -1, PREG_SPLIT_NO_EMPTY);
        $hasCredit = (bool) array_intersect($tokens, ['credit', 'zp', 'zapocet', 'kz', 'ko', 'kolokvium']);
        $hasExam = (bool) array_intersect($tokens, ['exam', 'zk', 'zkouska']);

        return match (true) {
            $hasCredit && $hasExam => 'Credit + Exam',
            $hasExam => 'Exam',
            $hasCredit => 'Credit',
            default => null,
        };
    }

    /**
     * Nastaví final_grade a status podle výsledků ze STAGu tak, aby jim rozuměl
     * SubjectStagResultCard. Rozhoduje zkouška; zápočet jen u předmětu zakončeného zápočtem.
     */
    private function applyStagResult(Subject $subject): void
    {
        $exam = trim((string) $subject->exam_result);
        $credit = trim((string) $subject->credit_result);

        if ($exam !== '') {
            $subject->final_grade = $exam;
            $subject->status = $this->resultStatus($exam) ?? $subject->status ?? 'in_progress';
        } elseif ($credit !== '' && $subject->completion_type === 'Credit') {
            // Klasifikovaný zápočet má známku, běžný zápočet jen splněno / nesplněno
            $subject->final_grade = in_array($this->normalizeResult($credit), self::GRADES, true) ? $credit : null;
            $subject->status = $this->resultStatus($credit) ?? $subject->status ?? 'in_progress';
        } else {
            $subject->final_grade = null;
            $subject->status = 'in_progress';
        }
    }

    private function resultStatus(string $result): ?string
    {
        $normalized = $this->normalizeResult($result);

        return match (true) {
            in_array($normalized, self::PASSING_RESULTS, true) => 'completed',
            in_array($normalized, self::FAILING_RESULTS, true) => 'failed',
            default => null,
        };
    }

    private function normalizeResult(string $result): string
    {
        return strtoupper(preg_replace('/\s+/', ' ', trim(Str::ascii($result))));
    }

    private function eventKey(string $date, ?string $time): string
    {
        return substr($date, 0, 10) . ' ' . $time;
    }
}
