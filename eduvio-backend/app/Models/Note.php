<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject_id',
        'content',
    ];

    protected $appends = [
        'subjectId',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function getSubjectIdAttribute()
    {
        return $this->attributes['subject_id'] ?? null;
    }
}
