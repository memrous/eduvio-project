<?php

namespace App\Http\Controllers;

use App\Models\Requirement;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MoodleController extends Controller
{
    /**
     * POST /api/moodle/sync-requirements
     * Přijme transformovaná data z Pythonu a synchronizuje požadavky/aktivity Moodle.
     * Import je plně idempotentní (opakované spuštění aktualizuje existující položky).
     */
    public function syncRequirements(Request $request)
    {
        $validated = $request->validate([
            '*.subjectCode'               => 'required|string|max:255',
            '*.requirement.type'         => 'required|string|max:255',
            '*.requirement.title'        => 'required|string|max:255',
            '*.requirement.dueDate'      => 'nullable|date_format:Y-m-d',
            '*.requirement.dueTime'      => 'nullable|string',
            '*.requirement.maxPoints'    => 'nullable|integer',
            '*.requirement.gainedPoints' => 'nullable|integer',
            '*.requirement.completed'    => 'nullable|boolean',
            '*.requirement.weight'       => 'nullable|integer',
            '*.requirement.grade'        => 'nullable|string|max:255',
            '*.requirement.context'      => 'nullable|string',
        ]);

        $user = $request->user();
        $syncedCount = 0;

        DB::transaction(function () use ($request, $user, &$syncedCount) {
            foreach ($request->all() as $item) {
                $subjectCode = $item['subjectCode'];
                $reqData = $item['requirement'];

                // Najít předmět konkrétního uživatele podle kódů (např. KIV/PIA)
                $subject = Subject::where('user_id', $user->id)
                    ->where('code', $subjectCode)
                    ->first();

                if (!$subject) {
                    continue;
                }

                // Idempotentní vytvoření nebo aktualizace (vyhledává se podle subject_id a názvu úkolu)
                Requirement::updateOrCreate(
                    [
                        'subject_id' => $subject->id,
                        'title'      => $reqData['title'],
                    ],
                    [
                        'type'          => $reqData['type'],
                        'due_date'      => $reqData['dueDate'] ?? null,
                        'due_time'      => $reqData['dueTime'] ?? null,
                        'max_points'    => $reqData['maxPoints'] ?? null,
                        'gained_points' => $reqData['gainedPoints'] ?? null,
                        'completed'     => $reqData['completed'] ?? false,
                        'weight'        => $reqData['weight'] ?? null,
                        'grade'         => $reqData['grade'] ?? null,
                        'context'       => $reqData['context'] ?? 'Importováno z Moodle',
                    ]
                );

                $syncedCount++;
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Moodle sync successful. {$syncedCount} requirements were processed/updated.",
        ], 200);
    }
}
