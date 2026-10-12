<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Material;
use App\Models\Subject;
use App\Support\FileSize;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MaterialController extends Controller
{
    /**
     * GET /api/materials/{id}/file — the uploaded file of the user's material,
     * inline (preview) or as an attachment with ?download=1. Streamed from the
     * materials disk (local or S3), never redirected to a public address.
     */
    public function file(Request $request, $id)
    {
        $material = $this->findOwned($request->user()->id, $id);

        $disk = Material::filesDisk();
        if (! $material->hasOwnFile() || ! $disk->exists($material->file_path)) {
            abort(404);
        }

        $name = $material->file_name ?: basename($material->file_path);
        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return $disk->response($material->file_path, $name, [
            'Cache-Control'          => 'private, max-age=0, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], $disposition);
    }

    public function index(Request $request)
    {
        $materials = Material::where(function ($query) use ($request) {
            $query->whereHas('subject', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })->orWhere('resources.user_id', $request->user()->id);
        })->get();

        return response()->json($materials);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;
        $isPlatform = $request->input('category') === 'platform';

        $validated = $request->validate([
            'subjectId' => $this->subjectRule($userId),
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'url' => $isPlatform
                ? ['required', 'string', 'max:255', 'url:http,https']
                : 'nullable|string|max:255',
            'file' => [Rule::prohibitedIf($isPlatform), 'nullable', 'file', 'max:51200'],
            'size' => 'nullable|string|max:255',
            'eventId' => 'nullable|integer',
            'requirementId' => 'nullable|integer',
            'category' => 'nullable|string|in:file,platform',
        ]);

        if ($isPlatform) {
            return $this->storePlatformLink($userId, $validated);
        }

        $eventId = $validated['eventId'] ?? null;
        $this->assertEventMatchesSubject($userId, $eventId, $validated['subjectId'] ?? null);

        $material = new Material();
        $material->subject_id = $validated['subjectId'] ?? null;
        $material->title = $validated['title'];
        $material->type = $validated['type'];
        $material->description = $validated['description'] ?? null;
        $material->event_id = $eventId;
        $material->requirement_id = $validated['requirementId'] ?? null;
        $material->category = $validated['category'] ?? 'file';

        if (empty($validated['subjectId'])) {
            $material->user_id = $userId;
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $material->file_path = $file->store('materials', Material::filesDiskName());
            $material->size = FileSize::format($file->getSize());
            $material->file_name = $file->getClientOriginalName();
        } else {
            $material->url = $validated['url'] ?? null;
            $material->size = $validated['size'] ?? 'External Link';
            $material->file_name = null;
        }

        if (! $material->hasOwnFile()) {
            $material->save();

            return response()->json($material, 201);
        }

        // The file's address needs the id (url is NOT NULL, so a placeholder first)
        DB::transaction(function () use ($material) {
            $material->url = '';
            $material->save();
            $material->url = $material->fileUrl();
            $material->save();
        });

        return response()->json($material, 201);
    }

    /**
     * Edit a semester link (category "platform"). Editing an automatically
     * found link turns it into a manual one, so later syncs keep it.
     */
    public function update(Request $request, $id)
    {
        $userId = $request->user()->id;
        $material = $this->findOwned($userId, $id);

        if ($material->category !== 'platform') {
            return response()->json([
                'message' => 'Only semester links can be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'subjectId' => $this->subjectRule($userId),
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'url' => ['sometimes', 'required', 'string', 'max:255', 'url:http,https'],
        ]);

        $subjectId = array_key_exists('subjectId', $validated) ? $validated['subjectId'] : $material->subject_id;
        $url = $validated['url'] ?? $material->url;
        $this->assertLinkIsUnique($userId, $subjectId, $url, $material->id);

        $material->subject_id = $subjectId;
        $material->url = $url;
        $material->title = $validated['title'] ?? $material->title;
        if (array_key_exists('description', $validated)) {
            $material->description = $validated['description'];
        }
        $material->user_id = $userId;
        $material->link_source = 'manual';
        $material->save();

        return response()->json($material);
    }

    /**
     * Change a material. Manual materials: title, description, subjectId,
     * type, url (links only), file (uploaded files only, replaces the old one),
     * eventId. Moodle and automatic materials: only eventId and hidden; they
     * are recreated by syncs, so their content is not editable.
     *
     * A file is sent as multipart POST with _method=PATCH (PHP does not parse
     * multipart PATCH bodies).
     */
    public function patch(Request $request, $id)
    {
        $userId = $request->user()->id;
        $material = $this->findOwned($userId, $id);

        $contentFields = ['title', 'description', 'subjectId', 'type', 'url', 'file'];
        $sent = array_values(array_filter(
            [...$contentFields, 'eventId', 'hidden'],
            fn (string $field) => $request->has($field) || $request->hasFile($field),
        ));
        if ($sent === []) {
            throw ValidationException::withMessages(['material' => 'Nothing to update.']);
        }

        $this->assertFieldsAllowed($material, $sent, $contentFields);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'subjectId' => ['sometimes', ...$this->subjectRule($userId)],
            'type' => 'sometimes|required|string|max:255',
            'url' => ['sometimes', 'required', 'string', 'max:255', 'url:http,https'],
            'file' => 'sometimes|file|max:51200',
            'eventId' => 'sometimes|nullable|integer',
            'hidden' => 'sometimes|boolean',
        ]);

        $subjectId = array_key_exists('subjectId', $validated) ? $validated['subjectId'] : $material->subject_id;
        $subjectChanged = (string) $subjectId !== (string) $material->subject_id;

        // A lesson belongs to one subject: moving to another subject drops it unless a new one is chosen
        if (array_key_exists('eventId', $validated)) {
            $eventId = $validated['eventId'];
            $this->assertEventMatchesSubject($userId, $eventId, $subjectId);
            $material->event_id = $eventId;
            $material->event_manually_set = true;
        } elseif ($subjectChanged && $material->event_id !== null) {
            $material->event_id = null;
        }

        if ($material->category === 'platform' && ($subjectChanged || isset($validated['url']))) {
            $this->assertLinkIsUnique($userId, $subjectId, $validated['url'] ?? $material->url, $material->id);
        }

        if ($material->isManual()) {
            $material->subject_id = $subjectId;
            $material->user_id = $userId; // keeps ownership when moved to "Jiné"
            foreach (['title', 'description', 'type', 'url'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $material->{$field} = $validated[$field];
                }
            }
        }

        if (array_key_exists('hidden', $validated)) {
            $material->hidden_at = $validated['hidden'] ? ($material->hidden_at ?? now()) : null;
        }

        $oldFile = null;
        if ($request->hasFile('file')) {
            $oldFile = $material->file_path;
            $file = $request->file('file');
            $material->file_path = $file->store('materials', Material::filesDiskName());
            $material->url = $material->fileUrl();
            $material->size = FileSize::format($file->getSize());
            $material->file_name = $file->getClientOriginalName();
        }

        $material->save();

        // The replaced file is removed only after the new one is saved
        if ($oldFile !== null && $oldFile !== $material->file_path) {
            Material::filesDisk()->delete($oldFile);
        }

        return response()->json($material);
    }

    /**
     * Hide a Moodle or automatic material; syncs keep it hidden.
     */
    public function hide(Request $request, $id)
    {
        return $this->setHidden($request, $id, true);
    }

    public function unhide(Request $request, $id)
    {
        return $this->setHidden($request, $id, false);
    }

    /**
     * Marks any material (own, Moodle, automatic) as exam preparation, or unmarks it.
     */
    public function markForExam(Request $request, $id)
    {
        return $this->setForExam($request, $id, true);
    }

    public function unmarkForExam(Request $request, $id)
    {
        return $this->setForExam($request, $id, false);
    }

    private function setForExam(Request $request, $id, bool $forExam)
    {
        $material = $this->findOwned($request->user()->id, $id);

        $material->for_exam = $forExam;
        $material->save();

        return response()->json($material);
    }

    /**
     * The user looked at a semester link: new files on its page are no longer new.
     */
    public function seen(Request $request, $id)
    {
        $material = $this->findOwned($request->user()->id, $id);

        $material->seen_at = now();
        $material->page_links_new = null;
        $material->save();

        return response()->json($material);
    }

    public function destroy(Request $request, $id)
    {
        $userId = $request->user()->id;

        $material = $this->findOwned($userId, $id);

        // Moodle and automatic materials would come back on the next sync: hide them instead
        if (! $material->isManual()) {
            return response()->json([
                'message' => 'Synced materials cannot be deleted, hide them instead.',
            ], 422);
        }

        $storedFile = $material->file_path;
        $material->delete();
        if ($storedFile !== null) {
            Material::filesDisk()->delete($storedFile);
        }

        return response()->json([
            'message' => 'Material deleted successfully.',
            'id' => (int)$id,
        ]);
    }

    private function setHidden(Request $request, $id, bool $hidden)
    {
        $material = $this->findOwned($request->user()->id, $id);

        if ($material->isManual()) {
            return response()->json([
                'message' => 'Own materials are deleted, not hidden.',
            ], 422);
        }

        $material->hidden_at = $hidden ? ($material->hidden_at ?? now()) : null;
        $material->save();

        return response()->json($material);
    }

    /**
     * @param  list<string>  $sent  fields present in the request
     * @param  list<string>  $contentFields  fields only manual materials may change
     */
    private function assertFieldsAllowed(Material $material, array $sent, array $contentFields): void
    {
        $errors = [];

        if (! $material->isManual()) {
            foreach (array_intersect($sent, $contentFields) as $field) {
                $errors[$field] = 'This field cannot be changed for Moodle or automatic materials.';
            }
        } elseif (in_array('hidden', $sent, true)) {
            $errors['hidden'] = 'Own materials are deleted, not hidden.';
        }

        if ($material->category === 'platform') {
            if (in_array('eventId', $sent, true)) {
                $errors['eventId'] = 'Semester links are not assigned to lessons.';
            }
            if (in_array('file', $sent, true)) {
                $errors['file'] = 'Semester links have no file.';
            }
        } elseif ($material->isManual()) {
            $ownFile = $material->hasOwnFile();
            if ($ownFile && in_array('url', $sent, true)) {
                $errors['url'] = 'An uploaded file has no address; replace the file instead.';
            }
            if (! $ownFile && in_array('file', $sent, true)) {
                $errors['file'] = 'Only uploaded files can be replaced.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function storePlatformLink(int $userId, array $validated)
    {
        $subjectId = $validated['subjectId'] ?? null;

        // The same page found automatically becomes a manual link instead of a duplicate
        $autoLink = Material::where('category', 'platform')
            ->where('subject_id', $subjectId)
            ->where('url', $validated['url'])
            ->where('link_source', 'auto')
            ->where('user_id', $userId)
            ->first();

        if (! $autoLink) {
            $this->assertLinkIsUnique($userId, $subjectId, $validated['url']);
        }

        $material = $autoLink ?? new Material();
        $material->fill([
            'user_id' => $userId,
            'subject_id' => $subjectId,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'url' => $validated['url'],
            'size' => 'External Link',
            'category' => 'platform',
            'link_source' => 'manual',
        ]);
        $material->save();

        return response()->json($material, $autoLink ? 200 : 201);
    }

    private function assertLinkIsUnique(int $userId, ?int $subjectId, string $url, ?int $ignoreId = null): void
    {
        $exists = Material::where('category', 'platform')
            ->where('subject_id', $subjectId)
            ->where('url', $url)
            ->where(function ($query) use ($userId) {
                $query->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'url' => 'This link is already saved for the subject.',
            ]);
        }
    }

    /**
     * A lesson must be an event of the user's subject, the same subject as the material.
     */
    private function assertEventMatchesSubject(int $userId, $eventId, $subjectId): void
    {
        if ($eventId === null) {
            return;
        }

        $matches = $subjectId !== null && Event::where('id', $eventId)
            ->where('subject_id', $subjectId)
            ->whereHas('subject', fn ($query) => $query->where('user_id', $userId))
            ->exists();

        if (! $matches) {
            throw ValidationException::withMessages([
                'eventId' => 'The selected lesson does not belong to the subject of the material.',
            ]);
        }
    }

    private function subjectRule(int $userId): array
    {
        return [
            'nullable',
            'integer',
            function ($attribute, $value, $fail) use ($userId) {
                $exists = Subject::where('id', $value)->where('user_id', $userId)->exists();
                if (!$exists) {
                    $fail('The selected subject is invalid or does not belong to the user.');
                }
            },
        ];
    }

    private function findOwned(int $userId, $id): Material
    {
        return Material::where(function ($query) use ($userId) {
            $query->whereHas('subject', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })->orWhere('resources.user_id', $userId);
        })->findOrFail($id);
    }
}
