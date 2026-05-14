<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BenefitRule extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'code',
        'employee_rate',
        'employer_rate',
        'calculation_base',
        'max_limit',
        'active',
        'accounting_account_id',
    ];

    protected function casts(): array
    {
        return [
            'employee_rate' => 'decimal:4',
            'employer_rate' => 'decimal:4',
            'max_limit' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function accountingAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'accounting_account_id');
    }
}
