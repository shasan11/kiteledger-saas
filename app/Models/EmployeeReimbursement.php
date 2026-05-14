<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeReimbursement extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'employee_id',
        'branch_id',
        'date',
        'expense_category',
        'amount',
        'currency_id',
        'exchange_rate',
        'base_currency_amount',
        'description',
        'attachment',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'void_reason',
        'payment_reference',
        'journal_voucher_id',
        'payroll_run_id',
        'payslip_id',
        'include_in_payroll',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'amount' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
            'base_currency_amount' => 'decimal:2',
            'approved_at' => 'datetime',
            'include_in_payroll' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
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
