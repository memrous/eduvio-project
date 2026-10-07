<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StagController extends Controller
{
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
                $subject->completion_type = $item['completionType'] ?? 'Credit';
                $statutVal = !empty($item['statut']) ? strtoupper($item['statut']) : null;
                $subject->statut          = $statutVal;
                $subject->is_mandatory    = $statutVal !== null
                    ? ($statutVal === 'A')
                    : ($item['isMandatory'] ?? true);
                $subject->lecturer        = $item['lecturer'] ?? 'Nespecifikováno';
                $subject->department      = $item['department'] ?? null;
                $subject->source          = 'stag';
                $subject->stag_removed_at = null;

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

    private function eventKey(string $date, ?string $time): string
    {
        return substr($date, 0, 10) . ' ' . $time;
    }
}
