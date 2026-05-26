<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankStatementLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'bank_account_id',
        'account_id',
        'statement_date',
        'description',
        'reference',
        'debit',
        'credit',
        'balance',
        'counterparty',
        'remarks',
        'status',
        'imported_by_id',
        'posted_journal_voucher_id',
    ];

    protected function casts(): array
    {
        return [
            'statement_date' => 'date',
            'debit' => 'decimal:2',
            'credit' => 'decimal:2',
            'balance' => 'decimal:2',
            'imported_by_id' => 'integer',
        ];
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
