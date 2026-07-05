<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankReconciliation extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'bank_account_id',
        'branch_id',
        'fiscal_year_id',
        'reference',
        'statement_date',
        'period_from',
        'period_to',
        'opening_bank_balance',
        'closing_bank_balance',
        'software_balance',
        'matched_amount',
        'unmatched_bank_amount',
        'unmatched_software_amount',
        'reconciliation_difference',
        'status',
        'finalized_at',
        'finalized_by_id',
        'remarks',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'statement_date' => 'date',
            'period_from' => 'date',
            'period_to' => 'date',
            'opening_bank_balance' => 'decimal:2',
            'closing_bank_balance' => 'decimal:2',
            'software_balance' => 'decimal:2',
            'matched_amount' => 'decimal:2',
            'unmatched_bank_amount' => 'decimal:2',
            'unmatched_software_amount' => 'decimal:2',
            'reconciliation_difference' => 'decimal:2',
            'finalized_at' => 'datetime',
            'finalized_by_id' => 'integer',
            'user_add_id' => 'integer',
        ];
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BankReconciliationItem::class);
    }

    public function statementLines(): HasMany
    {
        return $this->hasMany(BankStatementLine::class, 'bank_reconciliation_id');
    }

    public function isLocked(): bool
    {
        return $this->status === 'finalized';
    }
}
