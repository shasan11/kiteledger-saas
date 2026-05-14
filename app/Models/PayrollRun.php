<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'payroll_period_id',
        'branch_id',
        'run_number',
        'status',
        'total_employees',
        'total_gross',
        'total_deductions',
        'total_net_payable',
        'currency_id',
        'exchange_rate',
        'generated_by',
        'generated_at',
        'approved_by',
        'approved_at',
        'paid_by',
        'paid_at',
        'locked_by',
        'locked_at',
        'void_reason',
        'voided_by',
        'voided_at',
        'journal_voucher_id',
        'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'total_employees' => 'integer',
            'total_gross' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'total_net_payable' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
            'generated_at' => 'datetime',
            'approved_at' => 'datetime',
            'paid_at' => 'datetime',
            'locked_at' => 'datetime',
            'voided_at' => 'datetime',
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

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }
}
