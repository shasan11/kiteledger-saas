<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\HasReportingTags;
use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesReturn extends Model
{
    use HasFactory, HasFiscalYear, HasReportingTags, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'fiscal_year_id',
        'sales_return_no',
        'sales_return_date',
        'contact_id',
        'warehouse_id',
        'currency_id',
        'reference',
        'notes',
        'remarks',
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
        'has_refund',
        'refund_account_id',
        'refund_reference',
        'refund_amount',
        'user_add_id',
        'journal_voucher_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sales_return_date' => 'date',
            'active' => 'boolean',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'void' => 'boolean',
            'voided_by_id' => 'integer',
            'voided_at' => 'datetime',
            'exchange_rate' => 'decimal:6',
            'total' => 'decimal:6',
            'has_refund' => 'boolean',
            'refund_amount' => 'decimal:6',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
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

    public function journalVoucher(): BelongsTo
    {
        return $this->belongsTo(JournalVoucher::class);
    }

    public function refundAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'refund_account_id');
    }

    public function salesReturnLines(): HasMany
    {
        return $this->hasMany(SalesReturnLine::class);
    }
}
