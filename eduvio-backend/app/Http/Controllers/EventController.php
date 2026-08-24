<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Subject;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = Event::whereHas('subject', function ($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        })->get();

        return response()->json($events);
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
            'title' => 'required|string|max:255',
            'date' => 'required|date_format:Y-m-d',
            'startTime' => 'required|string',
            'endTime' => 'nullable|string',
            'type' => 'required|string|max:255',
            'status' => 'nullable|string|max:255',
            'room' => 'nullable|string|max:255',
            'teacherName' => 'nullable|string|max:255',
            'teacherEmail' => 'nullable|string|email|max:255',
            'requirementId' => 'nullable|integer',
        ]);

        $event = new Event();
        $event->subject_id = $validated['subjectId'];
        $event->title = $validated['title'];
        $event->date = $validated['date'];
        $event->time = $validated['startTime'];
        $event->end_time = $validated['endTime'] ?? null;
        $event->type = $validated['type'];
        $event->status = $validated['status'] ?? 'Not Started';
        $event->room = $validated['room'] ?? null;
        $event->teacher_name = $validated['teacherName'] ?? null;
        $event->teacher_email = $validated['teacherEmail'] ?? null;
        $event->requirement_id = $validated['requirementId'] ?? null;
        $event->save();

        return response()->json($event, 201);
    }

    public function update(Request $request, $id)
    {
        $userId = $request->user()->id;

        $event = Event::whereHas('subject', function ($query) use ($userId) {
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
            'title' => 'required|string|max:255',
            'date' => 'required|date_format:Y-m-d',
            'startTime' => 'required|string',
            'endTime' => 'nullable|string',
            'type' => 'required|string|max:255',
            'status' => 'nullable|string|max:255',
            'room' => 'nullable|string|max:255',
            'teacherName' => 'nullable|string|max:255',
            'teacherEmail' => 'nullable|string|email|max:255',
            'requirementId' => 'nullable|integer',
        ]);

        $event->subject_id = $validated['subjectId'];
        $event->title = $validated['title'];
        $event->date = $validated['date'];
        $event->time = $validated['startTime'];
        $event->end_time = $validated['endTime'] ?? null;
        $event->type = $validated['type'];
        if (isset($validated['status'])) {
            $event->status = $validated['status'];
        }
        $event->room = $validated['room'] ?? null;
        $event->teacher_name = $validated['teacherName'] ?? null;
        $event->teacher_email = $validated['teacherEmail'] ?? null;
        $event->requirement_id = $validated['requirementId'] ?? null;
        $event->save();

        return response()->json($event);
    }

    public function updateStatus(Request $request, $id)
    {
        $userId = $request->user()->id;

        $event = Event::whereHas('subject', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|max:255',
        ]);

        $event->status = $validated['status'];
        $event->save();

        return response()->json($event);
    }

    public function destroy(Request $request, $id)
    {
        $userId = $request->user()->id;

        $event = Event::whereHas('subject', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->findOrFail($id);

        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
            'id' => (int)$id,
        ]);
    }
}
