<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryComponent extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'code',
        'type',
        'calculation_type',
        'taxable',
        'affects_net_salary',
        'accounting_account_id',
        'active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'taxable' => 'boolean',
            'affects_net_salary' => 'boolean',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function accountingAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'accounting_account_id');
    }
}
