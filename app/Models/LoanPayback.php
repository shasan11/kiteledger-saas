<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanPayback extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'loan_account_id',
        'payback_date',
        'amount',
        'paid_from_account_id',
        'reference',
        'notes',
        'active',
        'is_system_generated',
        'journal_voucher_id',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'payback_date'       => 'date',
            'amount'             => 'decimal:6',
            'active'             => 'boolean',
            'is_system_generated'=> 'boolean',
            'user_add_id'        => 'integer',
        ];
    }

    public function loanAccount(): BelongsTo
    {
        return $this->belongsTo(LoanAccount::class);
    }

    public function paidFromAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'paid_from_account_id');
    }

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
