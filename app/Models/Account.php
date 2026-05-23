<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Account extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'code',
        'nature',
        'parent_id',
        'currency_id',
        'swift_code',
        'dr_amount',
        'cr_amount',
        'balance',
        'active',
        'is_system_generated',
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
            'dr_amount' => 'decimal:2',
            'cr_amount' => 'decimal:2',
            'balance' => 'decimal:2',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function childrens(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BankAccount::class);
    }

    public function chartOfAccounts(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class);
    }

    public function chartOfAccount(): HasOne
    {
        return $this->hasOne(ChartOfAccount::class);
    }

    public function fromTransfers(): HasMany
    {
        return $this->hasMany(CashTransfer::class);
    }

    public function toTransferLines(): HasMany
    {
        return $this->hasMany(CashTransferLine::class);
    }

    public function chequeAccounts(): HasMany
    {
        return $this->hasMany(ChequeRegister::class);
    }

    public function relatedChequeAccounts(): HasMany
    {
        return $this->hasMany(ChequeRegister::class);
    }

    public function customerPayments(): HasMany
    {
        return $this->hasMany(CustomerPayment::class);
    }

    public function supplierPayments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }
}
