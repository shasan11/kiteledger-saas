<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'user_id',
        'salary_month',
        'salary_year',
        'salary',
        'paid_leave',
        'unpaid_leave',
        'monthly_holiday',
        'public_holiday',
        'work_day',
        'shift_wise_work_hour',
        'monthly_work_hour',
        'hourly_salary',
        'working_hour',
        'salary_payable',
        'bonus',
        'bonus_comment',
        'deduction',
        'deduction_comment',
        'total_payable',
        'payment_status',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'salary' => 'decimal:2',
            'shift_wise_work_hour' => 'decimal:2',
            'monthly_work_hour' => 'decimal:2',
            'hourly_salary' => 'decimal:2',
            'working_hour' => 'decimal:2',
            'salary_payable' => 'decimal:2',
            'bonus' => 'decimal:2',
            'deduction' => 'decimal:2',
            'total_payable' => 'decimal:2',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
