<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Requirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject_id',
        'type',
        'title',
        'context',
        'due_date',
        'due_time',
        'weight',
        'max_points',
        'gained_points',
        'completed',
        'grade',
    ];

    protected $casts = [
        'completed' => 'boolean',
        'weight' => 'integer',
        'max_points' => 'integer',
        'gained_points' => 'integer',
    ];

    protected $appends = [
        'subjectId',
        'dueDate',
        'dueTime',
        'maxPoints',
        'gainedPoints',
        'grade',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function getSubjectIdAttribute()
    {
        return $this->attributes['subject_id'] ?? null;
    }

    public function getDueDateAttribute()
    {
        return $this->attributes['due_date'] ?? null;
    }

    public function getDueTimeAttribute()
    {
        return $this->attributes['due_time'] ?? null;
    }

    public function getMaxPointsAttribute()
    {
        return $this->attributes['max_points'] ?? null;
    }

    public function getGainedPointsAttribute()
    {
        return $this->attributes['gained_points'] ?? null;
    }

    public function getGradeAttribute()
    {
        return $this->attributes['grade'] ?? null;
    }
}
