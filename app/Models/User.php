<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        // Core auth
        'name',
        'branch_id',
        'username',
        'email',
        'password',
        'active',

        // Personal info
        'first_name',
        'last_name',
        'phone',
        'blood_group',
        'image',
        'street',
        'city',
        'state',
        'zip_code',
        'country',

        // Employment info
        'employee_id',
        'join_date',
        'leave_date',
        'employment_status_id',
        'department_id',
        'role_id',
        'shift_id',
        'leave_policy_id',
        'weekly_holiday_id',

        // System
        'is_system_generated',
        'user_add_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $attributes = [
        'active' => true,
        'is_system_generated' => false,
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            $name = trim((string) $user->getRawOriginal('name'));

            if ($name === '') {
                $name = trim(
                    ((string) $user->first_name) . ' ' . ((string) $user->last_name)
                );
            }

            if ($name === '') {
                $name = (string) $user->username;
            }

            $user->attributes['name'] = $name;
        });
    }

    public function getDisplayNameAttribute(): string
    {
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''))
            ?: ($this->username ?? $this->name ?? '');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function employmentStatus(): BelongsTo
    {
        return $this->belongsTo(EmploymentStatus::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function leavePolicy(): BelongsTo
    {
        return $this->belongsTo(LeavePolicy::class);
    }

    public function weeklyHoliday(): BelongsTo
    {
        return $this->belongsTo(WeeklyHoliday::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BankAccount::class, 'user_add_id');
    }

    public function salaryHistories(): HasMany
    {
        return $this->hasMany(SalaryHistory::class);
    }

    public function designationHistories(): HasMany
    {
        return $this->hasMany(DesignationHistory::class);
    }

    public function educations(): HasMany
    {
        return $this->hasMany(Education::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveApplications(): HasMany
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function awardHistories(): HasMany
    {
        return $this->hasMany(AwardHistory::class);
    }

    public function assignedTasks(): HasMany
    {
        return $this->hasMany(AssignedTask::class);
    }

    public function managedProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'project_manager_id');
    }
}