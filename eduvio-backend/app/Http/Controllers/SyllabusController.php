<?php

namespace App\Http\Controllers;

use App\Models\Requirement;
use App\Models\Subject;
use App\Models\SyllabusItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** Semester schedule from teachers' course pages (read-only, can be hidden). */
class SyllabusController extends Controller
{
    /**
     * GET /api/subjects/{subjectId}/syllabus — rows of the subject, without hidden ones.
     */
    public function index(Request $request, $subjectId): JsonResponse
    {
        $subject = Subject::where('user_id', $request->user()->id)->findOrFail($subjectId);

        $items = $subject->syllabusItems()
            ->whereNull('hidden_at')
            ->with('resource:id,url')
            ->orderBy('date')
            ->orderBy('id')
            ->get()
            ->map(fn (SyllabusItem $item) => $this->present($item));

        return response()->json($items);
    }

    /**
     * GET /api/syllabus/assessments — written tests and other assessments of all
     * subjects in the shape of requirements (source "web"), for the calendar.
     * Rows on the same day as a requirement of the subject are left out.
     */
    public function assessments(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $items = self::visibleAssessments($userId)->get();

        return response()->json(
            self::withoutRequirementDuplicates($userId, $items)
                ->map(fn (SyllabusItem $item) => self::asRequirement($item))
                ->values()
        );
    }

    public function hide(Request $request, $id): JsonResponse
    {
        return $this->setHidden($request, $id, true);
    }

    public function unhide(Request $request, $id): JsonResponse
    {
        return $this->setHidden($request, $id, false);
    }

    private function setHidden(Request $request, $id, bool $hidden): JsonResponse
    {
        $item = SyllabusItem::where('user_id', $request->user()->id)->findOrFail($id);
        $item->hidden_at = $hidden ? ($item->hidden_at ?? now()) : null;
        $item->save();

        return response()->json($this->present($item->load('resource:id,url')));
    }

    private function present(SyllabusItem $item): array
    {
        return array_merge($item->makeHidden('resource')->toArray(), [
            'source_url' => $item->resource?->url,
            'hidden'     => $item->hidden_at !== null,
        ]);
    }

    // ─── Shared with the dashboard ───────────────────────────────

    public static function visibleAssessments(int $userId)
    {
        return SyllabusItem::where('user_id', $userId)
            ->where('kind', SyllabusItem::KIND_ASSESSMENT)
            ->whereNull('hidden_at')
            ->with(['subject:id,code,name', 'resource:id,url'])
            ->orderBy('date');
    }

    /**
     * @param  Collection<int, SyllabusItem>  $items
     * @return Collection<int, SyllabusItem>
     */
    public static function withoutRequirementDuplicates(int $userId, Collection $items): Collection
    {
        if ($items->isEmpty()) {
            return $items;
        }
        $taken = Requirement::whereHas('subject', fn ($q) => $q->where('user_id', $userId))
            ->whereNotNull('due_date')
            ->get(['subject_id', 'due_date'])
            ->map(fn (Requirement $r) => $r->subject_id . '|' . substr((string) $r->due_date, 0, 10))
            ->flip();

        return $items->reject(fn (SyllabusItem $item) => $taken->has($item->subject_id . '|' . $item->date->format('Y-m-d')));
    }

    public static function asRequirement(SyllabusItem $item): array
    {
        $date = $item->date->format('Y-m-d');

        return [
            'id'             => 'web-' . $item->id,
            'syllabusItemId' => $item->id,
            'source'         => 'web',
            'subjectId'      => $item->subject_id,
            'subject_id'     => $item->subject_id,
            'subjectCode'    => $item->subject?->code,
            'title'          => $item->title,
            'description'    => $item->description,
            'type'           => $item->assessment_type,
            'assessmentType' => $item->assessment_type,
            'date'           => $date,
            'dueDate'        => $date,
            'due_date'       => $date,
            'completed'      => false,
            'sourceUrl'      => $item->resource?->url,
        ];
    }
}
