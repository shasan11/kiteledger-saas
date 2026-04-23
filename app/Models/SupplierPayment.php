<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierPayment extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'payment_no',
        'payment_date',
        'contact_id',
        'bank_account_id',
        'currency_id',
        'exchange_rate',
        'amount',
        'method',
        'reference',
        'notes',
        'bank_charges_account_id',
        'bank_charges',
        'tds_charges_account_id',
        'tds_type',
        'tds_charges',
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
            'payment_date' => 'date',
            'exchange_rate' => 'decimal:6',
            'amount' => 'decimal:2',
            'bank_charges' => 'decimal:2',
            'tds_charges' => 'decimal:2',
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

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function bankChargesAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }

    public function tdsChargesAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function supplierPaymentLines(): HasMany
    {
        return $this->hasMany(SupplierPaymentLine::class);
    }
}
