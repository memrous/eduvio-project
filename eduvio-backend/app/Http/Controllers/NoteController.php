<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function show(Request $request, $subjectId)
    {
        $subject = Subject::where('user_id', $request->user()->id)->findOrFail($subjectId);
        $note = $subject->note;

        if (!$note) {
            return response()->json(['content' => null]);
        }

        return response()->json($note);
    }

    public function update(Request $request, $subjectId)
    {
        $subject = Subject::where('user_id', $request->user()->id)->findOrFail($subjectId);

        $validated = $request->validate([
            'content' => 'nullable|string',
        ]);

        $note = $subject->note()->updateOrCreate(
            ['subject_id' => $subject->id],
            ['content' => $validated['content'] ?? null]
        );

        return response()->json($note);
    }
}
