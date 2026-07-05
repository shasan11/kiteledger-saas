<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashTransferLine extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'cash_transfer_id',
        'to_account_id',
        'exchange_rate_to_default',
        'amount',
        'description',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'exchange_rate_to_default' => 'decimal:6',
            'amount' => 'decimal:2',
        ];
    }

    public function cashTransfer(): BelongsTo
    {
        return $this->belongsTo(CashTransfer::class);
    }

    public function toAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
