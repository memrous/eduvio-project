<?php

namespace App\Http\Controllers;

use App\Models\Requirement;
use App\Models\Subject;
use Illuminate\Http\Request;

class RequirementController extends Controller
{
    public function index(Request $request)
    {
        $query = Requirement::whereHas('subject', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        });

        if ($request->has('subjectId')) {
            $query->where('subject_id', $request->query('subjectId'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $validated = $request->validate([
            'subjectId' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) use ($userId) {
                    $exists = Subject::where('id', $value)->where('user_id', $userId)->exists();
                    if (!$exists) {
                        $fail('The selected subject is invalid or does not belong to the user.');
                    }
                },
            ],
            'type' => 'required|string|in:homework,test,exam,project,milestone',
            'title' => 'required|string|max:255',
            'context' => 'nullable|string',
            'dueDate' => 'nullable|date_format:Y-m-d',
            'dueTime' => 'nullable|string',
            'weight' => 'nullable|integer',
            'maxPoints' => 'nullable|integer',
            'gainedPoints' => 'nullable|integer',
            'completed' => 'nullable|boolean',
        ]);

        $requirement = new Requirement();
        $requirement->subject_id = $validated['subjectId'];
        $requirement->type = $validated['type'];
        $requirement->title = $validated['title'];
        $requirement->context = $validated['context'] ?? null;
        $requirement->due_date = $validated['dueDate'] ?? null;
        $requirement->due_time = $validated['dueTime'] ?? null;
        $requirement->weight = $validated['weight'] ?? null;
        $requirement->max_points = $validated['maxPoints'] ?? null;
        $requirement->gained_points = $validated['gainedPoints'] ?? null;
        $requirement->completed = $validated['completed'] ?? false;
        $requirement->save();

        return response()->json($requirement, 201);
    }

    public function update(Request $request, $id)
    {
        $userId = $request->user()->id;

        $requirement = Requirement::whereHas('subject', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->findOrFail($id);

        $validated = $request->validate([
            'subjectId' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) use ($userId) {
                    $exists = Subject::where('id', $value)->where('user_id', $userId)->exists();
                    if (!$exists) {
                        $fail('The selected subject is invalid or does not belong to the user.');
                    }
                },
            ],
            'type' => 'nullable|string|in:homework,test,exam,project,milestone',
            'title' => 'nullable|string|max:255',
            'context' => 'nullable|string',
            'dueDate' => 'nullable|date_format:Y-m-d',
            'dueTime' => 'nullable|string',
            'weight' => 'nullable|integer',
            'maxPoints' => 'nullable|integer',
            'gainedPoints' => 'nullable|integer',
            'completed' => 'nullable|boolean',
        ]);

        $requirement->subject_id = $validated['subjectId'];
        
        if (array_key_exists('type', $validated)) {
            $requirement->type = $validated['type'];
        }
        if (array_key_exists('title', $validated)) {
            $requirement->title = $validated['title'];
        }
        if (array_key_exists('context', $validated)) {
            $requirement->context = $validated['context'];
        }
        if (array_key_exists('dueDate', $validated)) {
            $requirement->due_date = $validated['dueDate'];
        }
        if (array_key_exists('dueTime', $validated)) {
            $requirement->due_time = $validated['dueTime'];
        }
        if (array_key_exists('weight', $validated)) {
            $requirement->weight = $validated['weight'];
        }
        if (array_key_exists('maxPoints', $validated)) {
            $requirement->max_points = $validated['maxPoints'];
        }
        if (array_key_exists('gainedPoints', $validated)) {
            $requirement->gained_points = $validated['gainedPoints'];
        }
        if (array_key_exists('completed', $validated)) {
            $requirement->completed = $validated['completed'];
        }
        
        $requirement->save();

        return response()->json($requirement);
    }

    public function destroy(Request $request, $id)
    {
        $userId = $request->user()->id;

        $requirement = Requirement::whereHas('subject', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->findOrFail($id);

        $requirement->delete();

        return response()->json([
            'message' => 'Requirement deleted successfully.',
            'id' => (int)$id,
        ]);
    }
}
