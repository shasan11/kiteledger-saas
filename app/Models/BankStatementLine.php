<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankStatementLine extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

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
        'matched_journal_voucher_line_id',
        'bank_reconciliation_id',
        'match_confidence',
        'match_type',
        'matched_at',
        'matched_by_id',
        'transaction_hash',
    ];

    protected function casts(): array
    {
        return [
            'statement_date' => 'date',
            'debit' => 'decimal:2',
            'credit' => 'decimal:2',
            'balance' => 'decimal:2',
            'imported_by_id' => 'integer',
            'matched_by_id' => 'integer',
            'matched_at' => 'datetime',
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

    public function matchedJournalVoucherLine(): BelongsTo
    {
        return $this->belongsTo(JournalVoucherLine::class, 'matched_journal_voucher_line_id');
    }

    public function postedJournalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class, 'posted_journal_voucher_id');
    }

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(BankReconciliation::class, 'bank_reconciliation_id');
    }

    public function isMatched(): bool
    {
        return $this->status === 'matched'
            || ! empty($this->matched_journal_voucher_line_id)
            || ! empty($this->posted_journal_voucher_id);
    }

    public function signedAmount(): float
    {
        return (float) $this->debit - (float) $this->credit;
    }

    public function absoluteAmount(): float
    {
        return abs($this->signedAmount());
    }
}
