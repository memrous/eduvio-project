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
    ];

    protected $casts = [
        'subject_id' => 'integer',
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

    public function getCategoryAttribute()
    {
        return $this->attributes['category'] ?? null;
    }
}
