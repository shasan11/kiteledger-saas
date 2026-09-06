<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollSetting extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $attributes = [
        'daily_rate_basis' => 'working_days',
        'standard_working_days_mode' => 'working_days_only',
        'default_monthly_working_days' => 30,
        'rounding_method' => 'nearest',
        'currency_precision' => 2,
        'default_overtime_rate' => 0,
        'late_deduction_per_day' => 0,
        'overtime_enabled' => true,
        'late_deduction_enabled' => false,
        'unpaid_leave_deduction_enabled' => true,
        'auto_post_journal_voucher' => false,
        'require_approval_before_payment' => true,
        'allow_multiple_runs' => false,
        'active' => true,
    ];

    protected $fillable = [
        'branch_id',
        'currency_id',
        'daily_rate_basis',
        'standard_working_days_mode',
        'default_monthly_working_days',
        'rounding_method',
        'currency_precision',
        'default_overtime_rate',
        'late_deduction_per_day',
        'overtime_enabled',
        'late_deduction_enabled',
        'unpaid_leave_deduction_enabled',
        'auto_post_journal_voucher',
        'require_approval_before_payment',
        'salary_expense_account_id',
        'salary_payable_account_id',
        'tax_payable_account_id',
        'benefit_payable_account_id',
        'bank_account_id',
        'allow_multiple_runs',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'currency_precision' => 'integer',
            'default_monthly_working_days' => 'integer',
            'default_overtime_rate' => 'decimal:4',
            'late_deduction_per_day' => 'decimal:6',
            'overtime_enabled' => 'boolean',
            'late_deduction_enabled' => 'boolean',
            'unpaid_leave_deduction_enabled' => 'boolean',
            'auto_post_journal_voucher' => 'boolean',
            'require_approval_before_payment' => 'boolean',
            'allow_multiple_runs' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
}
