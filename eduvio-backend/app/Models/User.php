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
        'stag_student_id',
        'stag_ticket',
        'stag_ticket_expires_at',
        'stag_user_name',
        'stag_sync_status',
        'stag_sync_error',
        'stag_synced_at',
        'stag_last_sync_attempt_at',
        'moodle_sync_status',
        'moodle_sync_error',
        'moodle_synced_at',
        'moodle_last_sync_attempt_at',
        'moodle_wstoken',
        'moodle_display_name',
        'moodle_user_id',
        'moodle_launch_passport',
        'moodle_launch_expires_at',
        'study_program',
        'study_program_code',
        'faculty',
        'study_form',
        'study_type',
        'study_type_key',
        'study_year',
        'study_status',
        'study_officer_name',
        'study_officer_email',
        'study_officer_phone',
        'study_info_synced_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'stag_ticket',
        'stag_sync_error',
        'moodle_sync_error',
        'moodle_wstoken',
        'moodle_launch_passport',
        'moodle_launch_expires_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'stag_connected',
        'moodle_connected',
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
            'stag_ticket'                => 'encrypted',
            'stag_ticket_expires_at'     => 'datetime',
            'stag_synced_at'             => 'datetime',
            'stag_last_sync_attempt_at'  => 'datetime',
            'moodle_wstoken'             => 'encrypted',
            'moodle_synced_at'           => 'datetime',
            'moodle_last_sync_attempt_at'=> 'datetime',
            'moodle_launch_expires_at'   => 'datetime',
            'study_year'                 => 'integer',
            'study_info_synced_at'       => 'datetime',
        ];
    }

    /**
     * Name of the restricted Sanctum token used by the local STAG agent.
     */
    public const STAG_AGENT_TOKEN = 'stag-agent';

    /**
     * The user's STAG agent tokens (at most one is kept at a time).
     */
    public function stagAgentTokens()
    {
        return $this->tokens()->where('name', self::STAG_AGENT_TOKEN);
    }

    /**
     * STAG is considered connected when:
     * - mode "server": a ticket is stored and has not expired,
     * - mode "agent": the user has a non-expired agent token.
     */
    public function getStagConnectedAttribute(): bool
    {
        if (config('stag.mode') === 'agent') {
            return $this->stagAgentTokens()
                ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->exists();
        }

        if (empty($this->stag_ticket)) {
            return false;
        }

        return $this->stag_ticket_expires_at === null || $this->stag_ticket_expires_at->isFuture();
    }

    /**
     * Moodle is considered connected when a web service token is stored.
     */
    public function getMoodleConnectedAttribute(): bool
    {
        return ! empty($this->moodle_wstoken);
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }
}