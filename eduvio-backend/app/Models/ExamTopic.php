<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One item of the student's exam topic checklist for a subject. */
class ExamTopic extends Model
{
    protected $fillable = [
        'subject_id',
        'title',
        'is_done',
        'position',
    ];

    protected $casts = [
        'is_done' => 'boolean',
        'position' => 'integer',
        'subject_id' => 'integer',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
