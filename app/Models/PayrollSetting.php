<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollSetting extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'currency_id',
        'daily_rate_basis',
        'rounding_method',
        'currency_precision',
        'default_overtime_rate',
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
            'default_overtime_rate' => 'decimal:4',
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
