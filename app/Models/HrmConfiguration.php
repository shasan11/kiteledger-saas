<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrmConfiguration extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'default_working_hours_per_day', 'default_working_days_per_week',
        'attendance_grace_period_minutes', 'half_day_threshold_hours',
        'overtime_enabled', 'overtime_rate_multiplier', 'attendance_correction_enabled',
        'leave_year_start_month', 'payroll_day', 'probation_period_days',
        'weekend_days', 'require_leave_approval', 'require_attendance_approval',
        'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'default_working_hours_per_day' => 'decimal:2',
            'half_day_threshold_hours' => 'decimal:2',
            'overtime_enabled' => 'boolean',
            'overtime_rate_multiplier' => 'decimal:2',
            'attendance_correction_enabled' => 'boolean',
            'weekend_days' => 'array',
            'require_leave_approval' => 'boolean',
            'require_attendance_approval' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }
}
