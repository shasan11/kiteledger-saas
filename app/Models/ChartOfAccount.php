<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'account_id',
        'code',
        'name',
        'parent_id',
        'description',
        'currency_id',
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

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
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
        return $this->hasMany(ChartOfAccount::class);
    }

    public function journalVoucherLines(): HasMany
    {
        return $this->hasMany(JournalVoucherLine::class);
    }

    public function expenseLines(): HasMany
    {
        return $this->hasMany(ExpenseLine::class);
    }

    public function bankChargePayments(): HasMany
    {
        return $this->hasMany(CustomerPayment::class);
    }

    public function tdsPayments(): HasMany
    {
        return $this->hasMany(CustomerPayment::class);
    }
 
}
