<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSummary extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'employee_id',
        'payroll_period_id',
        'branch_id',
        'total_working_days',
        'present_days',
        'absent_days',
        'paid_leave_days',
        'unpaid_leave_days',
        'half_days',
        'late_days',
        'overtime_hours',
        'payable_days',
        'locked',
    ];

    protected function casts(): array
    {
        return [
            'total_working_days' => 'decimal:2',
            'present_days' => 'decimal:2',
            'absent_days' => 'decimal:2',
            'paid_leave_days' => 'decimal:2',
            'unpaid_leave_days' => 'decimal:2',
            'half_days' => 'decimal:2',
            'late_days' => 'integer',
            'overtime_hours' => 'decimal:2',
            'payable_days' => 'decimal:2',
            'locked' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class);
    }
}
