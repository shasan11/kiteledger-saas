<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalVoucher extends Model
{
    use HasFactory, HasFiscalYear, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'voucher_no',
        'voucher_date',
        'currency_id',
        'reference',
        'narration',
        'remarks',
        'source_type',
        'source_id',
        'source_no',
        'source_module',
        'is_auto_generated',
        'is_system_generated',
        'reversed_journal_voucher_id',
        'reversal_reason',
        'reversed_at',
        'status',
        'active',
        'approved',
        'approved_at',
        'approved_by_id',
        'void',
        'voided_by_id',
        'voided_reason',
        'voided_at',
        'exchange_rate',
        'total',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'voucher_date' => 'date',
            'active' => 'boolean',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'is_auto_generated' => 'boolean',
            'is_system_generated' => 'boolean',
            'reversed_at' => 'datetime',
            'void' => 'boolean',
            'voided_by_id' => 'integer',
            'voided_at' => 'datetime',
            'exchange_rate' => 'decimal:6',
            'total' => 'decimal:6',
            'user_add_id' => 'integer',
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

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function journalVoucherLines(): HasMany
    {
        return $this->hasMany(JournalVoucherLine::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(JournalVoucherLine::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalVoucherLine::class);
    }

    public function reversedJournalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class, 'reversed_journal_voucher_id');
    }

    public function reversalJournalVouchers(): HasMany
    {
        return $this->hasMany(JournalVoucher::class, 'reversed_journal_voucher_id');
    }
}
