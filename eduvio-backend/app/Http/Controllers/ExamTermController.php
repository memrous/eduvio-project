<?php

namespace App\Http\Controllers;

use App\Models\ExamTerm;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Exam and credit terms from IS/STAG. The sync script (server or agent) sends
 * the full list for the student; the user only reads it.
 */
class ExamTermController extends Controller
{
    /**
     * GET /api/subjects/{subjectId}/exam-terms
     */
    public function index(Request $request, $subjectId): JsonResponse
    {
        $subject = Subject::where('user_id', $request->user()->id)->findOrFail($subjectId);

        $terms = $subject->examTerms()
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        return response()->json($terms);
    }

    /**
     * POST /api/stag/sync-exam-terms
     * Replaces the user's terms with the list from STAG. Terms of subjects the
     * user does not have are skipped; an empty list removes all terms.
     */
    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            '*'                        => 'array',
            '*.stagId'                 => 'required|string|max:64',
            '*.subjectCode'            => 'required|string|max:255',
            '*.date'                   => 'required|date_format:Y-m-d',
            '*.startTime'              => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            '*.endTime'                => ['nullable', 'string', 'regex:/^\d{1,2}:\d{2}$/'],
            '*.kind'                   => 'nullable|string|in:' . implode(',', ExamTerm::KINDS),
            '*.room'                   => 'nullable|string|max:255',
            '*.examiner'               => 'nullable|string|max:255',
            '*.registered'             => 'nullable|boolean',
            '*.capacity'               => 'nullable|integer|min:0',
            '*.occupied'               => 'nullable|integer|min:0',
            '*.deregistrationDeadline' => 'nullable|date_format:Y-m-d',
            '*.note'                   => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        $items = array_values($request->all());
        $saved = 0;
        $skipped = 0;
        $deleted = 0;

        DB::transaction(function () use ($user, $items, &$saved, &$skipped, &$deleted) {
            $subjectIds = Subject::where('user_id', $user->id)->pluck('id', 'code');
            $keptStagIds = [];

            foreach ($items as $item) {
                $subjectId = $subjectIds[$item['subjectCode']] ?? null;
                if ($subjectId === null) {
                    $skipped++;
                    continue;
                }

                ExamTerm::updateOrCreate(
                    ['user_id' => $user->id, 'stag_id' => $item['stagId']],
                    [
                        'subject_id'              => $subjectId,
                        'date'                    => $item['date'],
                        'start_time'              => $this->time($item['startTime'] ?? null),
                        'end_time'                => $this->time($item['endTime'] ?? null),
                        'kind'                    => $item['kind'] ?? 'other',
                        'room'                    => $item['room'] ?? null,
                        'examiner'                => $item['examiner'] ?? null,
                        'is_registered'           => (bool) ($item['registered'] ?? false),
                        'capacity'                => $item['capacity'] ?? null,
                        'occupied'                => $item['occupied'] ?? null,
                        'deregistration_deadline' => $item['deregistrationDeadline'] ?? null,
                        'note'                    => $item['note'] ?? null,
                    ]
                );

                $keptStagIds[] = $item['stagId'];
                $saved++;
            }

            $deleted = ExamTerm::where('user_id', $user->id)
                ->whereNotIn('stag_id', $keptStagIds)
                ->delete();
        });

        return response()->json([
            'success' => true,
            'saved'   => $saved,
            'skipped' => $skipped,
            'deleted' => $deleted,
        ]);
    }

    /** "9:00" → "09:00" */
    private function time(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        [$hours, $minutes] = explode(':', $value);

        return str_pad($hours, 2, '0', STR_PAD_LEFT) . ':' . $minutes;
    }
}
