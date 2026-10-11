<?php

namespace App\Http\Controllers;

use App\Models\ExamTopic;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The student's own checklist of exam topics ("okruhy") for a subject. */
class ExamTopicController extends Controller
{
    private const MAX_TOPICS_PER_REQUEST = 100;

    /**
     * GET /api/subjects/{subjectId}/exam-topics
     */
    public function index(Request $request, $subjectId): JsonResponse
    {
        $subject = $this->findSubject($request, $subjectId);

        return response()->json(
            $subject->examTopics()->orderBy('position')->orderBy('id')->get()
        );
    }

    /**
     * POST /api/subjects/{subjectId}/exam-topics  { titles: string[] }
     * Adds one or more topics at the end (a pasted list arrives as several titles).
     */
    public function store(Request $request, $subjectId): JsonResponse
    {
        $subject = $this->findSubject($request, $subjectId);

        $validated = $request->validate([
            'titles'   => 'required|array|min:1|max:' . self::MAX_TOPICS_PER_REQUEST,
            // Blank lines of a pasted list arrive as null and are skipped
            'titles.*' => 'nullable|string|max:500',
        ]);

        $titles = array_values(array_filter(
            array_map(fn ($title) => trim(preg_replace('/\s+/u', ' ', (string) $title)), $validated['titles']),
            fn ($title) => $title !== ''
        ));

        if ($titles === []) {
            return response()->json(['message' => 'The titles must not be empty.'], 422);
        }

        $position = (int) $subject->examTopics()->max('position');
        $created = [];
        foreach ($titles as $title) {
            $created[] = $subject->examTopics()->create([
                'title'    => $title,
                'position' => ++$position,
            ]);
        }

        return response()->json($created, 201);
    }

    /**
     * PATCH /api/exam-topics/{topicId}  { title?, is_done? }
     */
    public function update(Request $request, $topicId): JsonResponse
    {
        $topic = $this->findTopic($request, $topicId);

        $validated = $request->validate([
            'title'   => 'sometimes|required|string|max:500',
            'is_done' => 'sometimes|required|boolean',
        ]);

        if (array_key_exists('title', $validated)) {
            $title = trim(preg_replace('/\s+/u', ' ', $validated['title']));
            if ($title === '') {
                return response()->json(['message' => 'The title must not be empty.'], 422);
            }
            $topic->title = $title;
        }
        if (array_key_exists('is_done', $validated)) {
            $topic->is_done = $validated['is_done'];
        }
        $topic->save();

        return response()->json($topic);
    }

    /**
     * DELETE /api/exam-topics/{topicId}
     */
    public function destroy(Request $request, $topicId): JsonResponse
    {
        $this->findTopic($request, $topicId)->delete();

        return response()->json(['id' => (int) $topicId]);
    }

    private function findSubject(Request $request, $subjectId): Subject
    {
        return Subject::where('user_id', $request->user()->id)->findOrFail($subjectId);
    }

    private function findTopic(Request $request, $topicId): ExamTopic
    {
        return ExamTopic::whereHas('subject', fn ($q) => $q->where('user_id', $request->user()->id))
            ->findOrFail($topicId);
    }
}
