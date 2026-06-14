<?php

namespace App\Models;

use App\Models\Concerns\HasFiscalYear;
use App\Models\Concerns\HasReportingTags;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Invoice extends Model
{
    use HasFactory, HasFiscalYear, HasReportingTags, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'project_id',
        'fiscal_year_id',
        'invoice_no',
        'invoice_date',
        'due_date',
        'contact_id',
        'warehouse_id',
        'currency_id',
        'reference',
        'notes',
        'remarks',
        'paid_total',
        'balance_due',
        'export_country',
        'export_date',
        'export_document_number',
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
            'invoice_date' => 'date',
            'due_date' => 'date',
            'paid_total' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'export_date' => 'date',
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

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
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

    public function invoiceLines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class);
    }

    public function customerPaymentLines(): HasMany
    {
        return $this->hasMany(CustomerPaymentLine::class);
    }

    public function paymentLinks(): HasMany
    {
        return $this->hasMany(InvoicePaymentLink::class);
    }

    public function paymentLink(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(InvoicePaymentLink::class)->where('active', true)->latest();
    }

    public function onlinePayments(): HasMany
    {
        return $this->hasMany(OnlinePayment::class);
    }

    public function recalculatePaymentTotals(): self
    {
        if ((bool) $this->void || $this->status === 'void') {
            return $this;
        }

        $paidTotal = (float) $this->customerPaymentLines()
            ->whereHas('customerPayment', function ($query) {
                $query->where('approved', true)
                    ->where(function ($query) {
                        $query->where('void', false)->orWhereNull('void');
                    });
            })
            ->sum('allocated_amount');

        $total = (float) ($this->total ?? 0);
        $balanceDue = max($total - $paidTotal, 0);

        $status = $this->status;
        if ((bool) $this->approved || $status !== 'draft') {
            if ($paidTotal <= 0) {
                $status = 'posted';
            } elseif ($paidTotal < $total) {
                $status = 'part_paid';
            } else {
                $status = 'paid';
            }
        }

        $this->forceFill([
            'paid_total' => round($paidTotal, 2),
            'balance_due' => round($balanceDue, 2),
            'status' => $status,
        ])->saveQuietly();

        return $this->refresh();
    }

    public static function recalculatePaymentTotalsForIds(array $invoiceIds): void
    {
        static::query()
            ->whereIn('id', array_values(array_unique(array_filter($invoiceIds))))
            ->get()
            ->each(fn (self $invoice) => $invoice->recalculatePaymentTotals());
    }

    public static function recalculatePaymentTotalsForContact(?string $contactId): void
    {
        if (!$contactId) {
            return;
        }

        static::query()
            ->where('contact_id', $contactId)
            ->get()
            ->each(fn (self $invoice) => $invoice->recalculatePaymentTotals());
    }
}
