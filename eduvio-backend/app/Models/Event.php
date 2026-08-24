<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject_id',
        'title',
        'date',
        'time',
        'end_time',
        'type',
        'status',
        'room',
        'teacher_name',
        'teacher_email',
        'requirement_id',
    ];

    protected $casts = [
        'subject_id' => 'integer',
    ];

    protected $appends = [
        'subjectId',
        'startTime',
        'endTime',
        'room',
        'teacherName',
        'teacherEmail',
        'requirementId',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function getSubjectIdAttribute()
    {
        return $this->attributes['subject_id'] ?? null;
    }
    
    public function getStartTimeAttribute()
    {
        return $this->attributes['time'] ?? null;
    }
    
    public function getEndTimeAttribute()
    {
        return $this->attributes['end_time'] ?? null;
    }

    public function getRoomAttribute()
    {
        return $this->attributes['room'] ?? null;
    }

    public function getTeacherNameAttribute()
    {
        return $this->attributes['teacher_name'] ?? null;
    }

    public function getTeacherEmailAttribute()
    {
        return $this->attributes['teacher_email'] ?? null;
    }

    public function getRequirementIdAttribute()
    {
        return $this->attributes['requirement_id'] ?? null;
    }
}
  