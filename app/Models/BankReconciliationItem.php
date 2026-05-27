<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankReconciliationItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'bank_reconciliation_id',
        'bank_statement_line_id',
        'journal_voucher_line_id',
        'type',
        'amount',
        'difference',
        'match_confidence',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'difference' => 'decimal:2',
        ];
    }

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(BankReconciliation::class, 'bank_reconciliation_id');
    }

    public function statementLine(): BelongsTo
    {
        return $this->belongsTo(BankStatementLine::class, 'bank_statement_line_id');
    }

    public function journalVoucherLine(): BelongsTo
    {
        return $this->belongsTo(JournalVoucherLine::class, 'journal_voucher_line_id');
    }
}
