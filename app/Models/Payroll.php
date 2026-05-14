<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payroll extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'payroll_period_id',
        'branch_id',
        'payroll_number',
        'run_number',
        'currency_id',
        'exchange_rate',
        'source_account_id',
        'status',
        'total_employees',
        'total_earnings',
        'total_gross',
        'total_deductions',
        'total_net_payable',
        'total_base_currency_amount',
        'journal_voucher_id',
        'generated_by',
        'generated_at',
        'approved_by',
        'approved_at',
        'processed_by',
        'processed_at',
        'paid_by',
        'paid_at',
        'locked_by',
        'locked_at',
        'void_reason',
        'voided_by',
        'voided_at',
        'reopened_by',
        'reopened_at',
        'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'total_employees' => 'integer',
            'total_earnings' => 'decimal:2',
            'total_gross' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'total_net_payable' => 'decimal:2',
            'total_base_currency_amount' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
            'generated_at' => 'datetime',
            'approved_at' => 'datetime',
            'processed_at' => 'datetime',
            'paid_at' => 'datetime',
            'locked_at' => 'datetime',
            'voided_at' => 'datetime',
            'reopened_at' => 'datetime',
        ];
    }

    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function sourceAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'source_account_id');
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function additions(): HasMany
    {
        return $this->hasMany(PayrollAddition::class);
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(PayrollDeduction::class);
    }

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }
}
