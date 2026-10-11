<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** An exam or credit term from IS/STAG (read-only for the user, replaced by syncs). */
class ExamTerm extends Model
{
    public const KINDS = ['exam', 'credit', 'other'];

    protected $fillable = [
        'user_id',
        'subject_id',
        'stag_id',
        'date',
        'start_time',
        'end_time',
        'kind',
        'room',
        'examiner',
        'is_registered',
        'capacity',
        'occupied',
        'deregistration_deadline',
        'note',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'deregistration_deadline' => 'date:Y-m-d',
        'is_registered' => 'boolean',
        'capacity' => 'integer',
        'occupied' => 'integer',
        'subject_id' => 'integer',
    ];

    protected $hidden = [
        'user_id',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
