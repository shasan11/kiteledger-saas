<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseBill extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'bill_no',
        'bill_date',
        'due_date',
        'contact_id',
        'warehouse_id',
        'currency_id',
        'reference',
        'notes',
        'import_country',
        'import_date',
        'import_document_number',
        'paid_total',
        'balance_due',
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
            'bill_date' => 'date',
            'due_date' => 'date',
            'import_date' => 'date',
            'paid_total' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'active' => 'boolean',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
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

    public function purchaseBillLines(): HasMany
    {
        return $this->hasMany(PurchaseBillLine::class);
    }

    public function supplierPaymentLines(): HasMany
    {
        return $this->hasMany(SupplierPaymentLine::class);
    }

    public function recalculatePaymentTotals(): self
    {
        if ((bool) $this->void || $this->status === 'void') {
            return $this;
        }

        $paidTotal = (float) $this->supplierPaymentLines()
            ->whereHas('supplierPayment', function ($query) {
                $query->where('approved', true)
                    ->where(function ($query) {
                        $query->where('void', false)->orWhereNull('void');
                    });
            })
            ->sum('allocated_amount');

        $total = (float) ($this->total ?? 0);
        $status = $this->status;

        if ((bool) $this->approved || $status !== 'draft') {
            $status = match (true) {
                $paidTotal <= 0 => 'posted',
                $paidTotal < $total => 'part_paid',
                default => 'paid',
            };
        }

        $this->forceFill([
            'paid_total' => round($paidTotal, 2),
            'balance_due' => round(max($total - $paidTotal, 0), 2),
            'status' => $status,
        ])->saveQuietly();

        return $this->refresh();
    }

    public static function recalculatePaymentTotalsForIds(array $ids): void
    {
        static::query()
            ->whereIn('id', array_values(array_unique(array_filter($ids))))
            ->get()
            ->each(fn (self $bill) => $bill->recalculatePaymentTotals());
    }

    public static function recalculatePaymentTotalsForContact(?string $contactId): void
    {
        if (!$contactId) {
            return;
        }

        static::query()
            ->where('contact_id', $contactId)
            ->get()
            ->each(fn (self $bill) => $bill->recalculatePaymentTotals());
    }
}
