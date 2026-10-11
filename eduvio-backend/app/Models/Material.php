<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Material extends Model
{
    use HasFactory;

    protected $table = 'resources';

    protected $fillable = [
        'subject_id',
        'title',
        'type',
        'description',
        'url',
        'size',
        'file_name',
        'event_id',
        'requirement_id',
        'category',
        'user_id',
        'moodle_cmid',
        'moodle_course_id',
        'moodle_section_id',
        'link_source',
        'source_person',
        'source_role',
        'last_checked_at',
        'page_links',
        'page_links_new',
        'content_changed_at',
        'seen_at',
        'event_manually_set',
        'hidden_at',
    ];

    protected $casts = [
        'event_manually_set' => 'boolean',
        'hidden_at' => 'datetime',
        'subject_id' => 'integer',
        'last_checked_at' => 'datetime',
        'page_links' => 'array',
        'page_links_new' => 'array',
        'content_changed_at' => 'datetime',
        'seen_at' => 'datetime',
    ];

    // The full snapshot is only needed for comparison on the server
    protected $hidden = [
        'page_links',
    ];

    protected $appends = [
        'subjectId',
        'uploadedAt',
        'eventId',
        'requirementId',
        'category',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function requirement()
    {
        return $this->belongsTo(Requirement::class);
    }

    public function getSubjectIdAttribute()
    {
        return $this->attributes['subject_id'] ?? null;
    }
    
    public function getUploadedAtAttribute()
    {
        return $this->created_at ? $this->created_at->toISOString() : null;
    }

    public function getEventIdAttribute()
    {
        return $this->attributes['event_id'] ?? null;
    }

    public function getRequirementIdAttribute()
    {
        return $this->attributes['requirement_id'] ?? null;
    }

    public function isFromMoodle(): bool
    {
        return $this->moodle_cmid !== null || $this->moodle_section_id !== null;
    }

    /** Found on a department website by DepartmentLinksSyncJob. */
    public function isAutoLink(): bool
    {
        return $this->link_source === 'auto';
    }

    /** Added by the user (file or link); syncs never recreate it. */
    public function isManual(): bool
    {
        return ! $this->isFromMoodle() && ! $this->isAutoLink();
    }

    /**
     * Path on the "public" disk when the file was uploaded to our storage
     * (url ".../storage/materials/x.pdf"), otherwise null.
     */
    public function storedFilePath(): ?string
    {
        $path = (string) parse_url((string) $this->url, PHP_URL_PATH);
        if (! str_starts_with($path, '/storage/materials/')) {
            return null;
        }

        $relative = rawurldecode(substr($path, strlen('/storage/')));

        return str_contains($relative, '..') ? null : $relative;
    }

    public function getCategoryAttribute()
    {
        return $this->attributes['category'] ?? null;
    }
}
