<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'purchase_order_no',
        'purchase_order_date',
        'contact_id',
        'currency_id',
        'credit_term_id',
        'exchange_rate',
        'notes',
        'status',
        'user_add_id',
        'active',
        'approved',
        'voided',
        'voided_reason',
        'voided_date',
        'voided_by_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purchase_order_date' => 'date',
            'exchange_rate' => 'decimal:6',
            'user_add_id' => 'integer',
            'active' => 'boolean',
            'approved' => 'boolean',
            'voided' => 'boolean',
            'voided_date' => 'date',
            'voided_by_id' => 'integer',
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

    public function creditTerm(): BelongsTo
    {
        return $this->belongsTo(CreditTerm::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function purchaseOrderLines(): HasMany
    {
        return $this->hasMany(PurchaseOrderLine::class);
    }
}
