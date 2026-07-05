<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollPayment extends Model
{
    use HasFactory, HasFiscalYear, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'payroll_run_id',
        'fiscal_year_id',
        'payroll_id',
        'payslip_id',
        'employee_id',
        'amount',
        'currency_id',
        'exchange_rate',
        'base_currency_amount',
        'payment_method',
        'bank_account_id',
        'payment_date',
        'reference_number',
        'status',
        'remarks',
        'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
            'base_currency_amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }
}
