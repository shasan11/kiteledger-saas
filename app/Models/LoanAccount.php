<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanAccount extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'bank_name',
        'loan_number',
        'description',
        'remarks',
        'opening_balance',
        'current_balance',
        'balance_as_of',
        'loan_received_in_account_id',
        'related_account_id',
        'interest_rate_per_annum',
        'duration_in_month',
        'processing_fee',
        'processing_fee_paid_from_account_id',
        'status',
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
            'opening_balance' => 'decimal:6',
            'current_balance' => 'decimal:6',
            'balance_as_of' => 'date',
            'interest_rate_per_annum' => 'decimal:4',
            'duration_in_month' => 'integer',
            'processing_fee' => 'decimal:6',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function loanReceivedInAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function relatedAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function processingFeePaidFromAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function loanTopUps(): HasMany
    {
        return $this->hasMany(LoanTopUp::class);
    }

    public function loanCharges(): HasMany
    {
        return $this->hasMany(LoanCharge::class);
    }

    public function loanPaybacks(): HasMany
    {
        return $this->hasMany(LoanPayback::class);
    }
}
