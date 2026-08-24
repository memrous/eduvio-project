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
            '*.subject.semester' => 'required|string|max:255',
            '*.subject.completionType' => 'nullable|string|max:255',
            '*.subject.isMandatory' => 'nullable|boolean',
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

        // Vše zabalíme do DB transakce, kdyby uprostřed nastala chyba, nic se neuloží napůl
        DB::transaction(function () use ($request, $user, &$importedCount) {
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
                        'semester' => $subjectData['semester'],
                        'completion_type' => $subjectData['completionType'] ?? 'Credit',
                        'is_mandatory' => $subjectData['isMandatory'] ?? true,
                        'description' => 'Imported from IS/STAG'
                    ]
                );

                // 3. Kontrola duplicity rozvrhové akce (Event)
                // Nechceme stejný rozvrh naimportovat dvakrát při opakovaném spuštění
                $eventExists = Event::where('subject_id', $subject->id)
                    ->where('date', $eventData['date'])
                    ->where('time', $eventData['startTime'])
                    ->exists();

                if (!$eventExists) {
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
                    $event->save();

                    $importedCount++;
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Sync successful. {$importedCount} new schedule events were created.",
        ], 200);
    }
}