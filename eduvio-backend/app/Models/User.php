<?php

namespace App\Models;

// 1. Ujisti se, že nahoře máš tento import:
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    // 2. Přidej HasApiTokens hned sem na začátek třídy:
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'university_id',
        'faculty_id',
        'study_program_id',
        'academic_year',
        'stag_student_id',
        'stag_username',
        'stag_password',
        'stag_sync_status',
        'stag_sync_error',
        'stag_synced_at',
        'stag_last_sync_attempt_at',
        'moodle_username',
        'moodle_password',
        'moodle_sync_status',
        'moodle_sync_error',
        'moodle_synced_at',
        'moodle_last_sync_attempt_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'stag_password',
        'stag_sync_error',
        'moodle_password',
        'moodle_sync_error',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'           => 'datetime',
            'password'                    => 'hashed',
            'stag_password'              => 'encrypted',
            'stag_synced_at'             => 'datetime',
            'stag_last_sync_attempt_at'  => 'datetime',
            'moodle_password'            => 'encrypted',
            'moodle_synced_at'           => 'datetime',
            'moodle_last_sync_attempt_at'=> 'datetime',
        ];
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    public function university()
    {
        return $this->belongsTo(University::class);
    }

    public function faculty()
    {
        return $this->belongsTo(Faculty::class);
    }

    public function studyProgram()
    {
        return $this->belongsTo(StudyProgram::class);
    }
}