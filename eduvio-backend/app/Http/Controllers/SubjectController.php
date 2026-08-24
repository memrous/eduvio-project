<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(Request $request)
    {
        $subjects = Subject::where('user_id', $request->user()->id)->get();
        return response()->json($subjects);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'credits' => 'required|integer',
            'lecturer' => 'required|string|max:255',
            'completionType' => 'nullable|string|max:255',
            'completion_type' => 'nullable|string|max:255',
            'isMandatory' => 'nullable|boolean',
            'is_mandatory' => 'nullable|boolean',
            'semester' => 'required|string|max:255',
            'description' => 'nullable|string',
            'guarantor' => 'nullable|string|max:255',
            'passThreshold' => 'nullable|integer',
            'pass_threshold' => 'nullable|integer',
        ]);

        $subject = new Subject();
        $subject->user_id = $request->user()->id;
        $subject->code = $validated['code'];
        $subject->name = $validated['name'];
        $subject->credits = $validated['credits'];
        $subject->lecturer = $validated['lecturer'];
        $subject->completion_type = $validated['completionType'] ?? $validated['completion_type'] ?? 'Credit';
        $subject->is_mandatory = $validated['isMandatory'] ?? $validated['is_mandatory'] ?? true;
        $subject->semester = $validated['semester'];
        $subject->description = $validated['description'] ?? null;
        $subject->guarantor = $validated['guarantor'] ?? null;
        $subject->pass_threshold = $validated['passThreshold'] ?? $validated['pass_threshold'] ?? null;
        $subject->save();

        return response()->json($subject, 201);
    }

    public function show(Request $request, $id)
    {
        $subject = Subject::where('user_id', $request->user()->id)
            ->with(['requirements', 'materials', 'note', 'events'])
            ->findOrFail($id);

        return response()->json($subject);
    }

    public function destroy(Request $request, $id)
    {
        $userId = $request->user()->id;

        $subject = Subject::where('user_id', $userId)->findOrFail($id);
        $subject->delete();

        return response()->json([
            'message' => 'Subject deleted successfully.',
            'id' => (int)$id,
        ]);
    }
}
