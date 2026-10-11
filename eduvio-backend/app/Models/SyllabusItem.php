<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One dated row of a semester schedule found on a teacher's course page. */
class SyllabusItem extends Model
{
    public const KIND_SESSION = 'session';
    public const KIND_ASSESSMENT = 'assessment';
    public const KIND_HOLIDAY = 'holiday';

    public const ASSESSMENT_TYPES = ['test', 'credit_test', 'retake', 'exam', 'deadline', 'project'];

    protected $fillable = [
        'user_id',
        'subject_id',
        'resource_id',
        'date',
        'title',
        'description',
        'links',
        'kind',
        'assessment_type',
        'hidden_at',
        'source_hash',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'links' => 'array',
        'hidden_at' => 'datetime',
        'subject_id' => 'integer',
        'resource_id' => 'integer',
    ];

    protected $hidden = [
        'user_id',
        'source_hash',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function resource()
    {
        return $this->belongsTo(Material::class, 'resource_id');
    }
}
