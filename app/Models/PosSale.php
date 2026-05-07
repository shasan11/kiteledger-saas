<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSale extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'pos_terminal_id',
        'pos_shift_id',
        'warehouse_id',
        'contact_id',
        'invoice_id',
        'customer_payment_id',
        'sales_return_id',
        'sale_no',
        'sale_date',
        'customer_name',
        'customer_phone',
        'customer_email',
        'subtotal',
        'discount_total',
        'tax_total',
        'round_off',
        'grand_total',
        'paid_total',
        'balance_due',
        'change_amount',
        'status',
        'payment_status',
        'notes',
        'receipt_note',
        'approved',
        'approved_at',
        'approved_by_id',
        'void',
        'voided_by_id',
        'voided_reason',
        'voided_at',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'datetime',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'round_off' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_total' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'approved' => 'boolean',
            'approved_at' => 'datetime',
            'approved_by_id' => 'integer',
            'void' => 'boolean',
            'voided_by_id' => 'integer',
            'voided_at' => 'datetime',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function posTerminal(): BelongsTo
    {
        return $this->belongsTo(PosTerminal::class);
    }

    public function posShift(): BelongsTo
    {
        return $this->belongsTo(PosShift::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customerPayment(): BelongsTo
    {
        return $this->belongsTo(CustomerPayment::class);
    }

    public function salesReturn(): BelongsTo
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by_id');
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }

    public function posSaleLines(): HasMany
    {
        return $this->hasMany(PosSaleLine::class);
    }

    public function posPayments(): HasMany
    {
        return $this->hasMany(PosPayment::class);
    }

    public function posReturns(): HasMany
    {
        return $this->hasMany(PosReturn::class);
    }
}
