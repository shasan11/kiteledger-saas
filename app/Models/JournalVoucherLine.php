<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalVoucherLine extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'journal_voucher_id',
        'account_id',
        'chart_of_account_id',
        'description',
        'debit',
        'credit',
        'foreign_debit',
        'foreign_credit',
        'currency_id',
        'exchange_rate',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'debit' => 'decimal:2',
            'credit' => 'decimal:2',
            'foreign_debit' => 'decimal:2',
            'foreign_credit' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
        ];
    }

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
}
