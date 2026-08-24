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
        'completion_type',
        'is_mandatory',
        'semester',
        'description',
        'guarantor',
        'pass_threshold',
        'status',
        'final_grade',
    ];

    protected $casts = [
        'is_mandatory' => 'boolean',
        'credits' => 'integer',
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
