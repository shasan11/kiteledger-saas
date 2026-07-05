<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    use HasFactory, HasFiscalYear, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'payroll_id',
        'payroll_run_id',
        'employee_id',
        'payslip_number',
        'status',
        'gross_earnings',
        'total_deductions',
        'employer_contributions',
        'net_payable',
        'currency_id',
        'exchange_rate',
        'base_currency_amount',
        'payable_days',
        'total_working_days',
        'unpaid_leave_days',
        'overtime_hours',
        'journal_voucher_id',
        'payment_reference',
        'calculation_snapshot',
        'remarks',
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
            'employee_id' => 'integer',
            'gross_earnings' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'employer_contributions' => 'decimal:2',
            'net_payable' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
            'base_currency_amount' => 'decimal:2',
            'payable_days' => 'decimal:2',
            'total_working_days' => 'decimal:2',
            'unpaid_leave_days' => 'decimal:2',
            'overtime_hours' => 'decimal:2',
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
            'calculation_snapshot' => 'array',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayslipLine::class);
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
