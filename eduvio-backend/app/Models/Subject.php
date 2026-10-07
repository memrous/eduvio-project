<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'code',
        'name',
        'credits',
        'lecturer',
        'department',
        'completion_type',
        'is_mandatory',
        'statut',
        'semester',
        'description',
        'guarantor',
        'pass_threshold',
        'status',
        'final_grade',
        'source',
        'stag_removed_at',
        'lecturers',
        'tutors',
        'stag_annotation',
        'stag_requirements',
        'stag_syllabus',
        'stag_literature',
        'stag_assessment',
        'exam_form',
        'credit_before_exam',
        'stag_url',
        'stag_completion_state',
        'credit_result',
        'credit_date',
        'credit_attempt',
        'credit_examiner',
        'exam_result',
        'exam_date',
        'exam_attempt',
        'exam_points',
        'exam_examiner',
    ];

    // Výchozí hodnoty, aby byly v JSON odpovědi i u čerstvě založeného předmětu
    protected $attributes = [
        'source' => 'manual',
        'stag_removed_at' => null,
    ];

    protected $casts = [
        'is_mandatory' => 'boolean',
        'credits' => 'integer',
        'stag_removed_at' => 'datetime',
        'credit_before_exam' => 'boolean',
        'credit_date' => 'date:Y-m-d',
        'credit_attempt' => 'integer',
        'exam_date' => 'date:Y-m-d',
        'exam_attempt' => 'integer',
        'exam_points' => 'float',
    ];

    protected $appends = [
        'completionType',
        'isMandatory',
        'guarantor',
        'passThreshold',
        'gainedPoints',
        'maxPoints',
        'gained_points',
        'max_points',
        'finalGrade',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function events()
    {
        return $this->hasMany(Event::class);
    }

    public function materials()
    {
        return $this->hasMany(Material::class, 'subject_id');
    }

    public function requirements()
    {
        return $this->hasMany(Requirement::class);
    }

    public function note()
    {
        return $this->hasOne(Note::class);
    }

    public function getCompletionTypeAttribute()
    {
        return $this->attributes['completion_type'] ?? null;
    }
    
    public function getIsMandatoryAttribute()
    {
        return $this->attributes['is_mandatory'] ?? null;
    }

    public function getGuarantorAttribute()
    {
        return $this->attributes['guarantor'] ?? null;
    }

    public function getPassThresholdAttribute()
    {
        return $this->attributes['pass_threshold'] ?? null;
    }

    public function getFinalGradeAttribute()
    {
        return $this->attributes['final_grade'] ?? null;
    }

    public function getGainedPointsAttribute()
    {
        if ($this->relationLoaded('requirements')) {
            return (int) $this->requirements->sum('gained_points');
        }
        return (int) $this->requirements()->sum('gained_points');
    }

    public function getMaxPointsAttribute()
    {
        if ($this->relationLoaded('requirements')) {
            return (int) $this->requirements->sum('max_points');
        }
        return (int) $this->requirements()->sum('max_points');
    }
}
