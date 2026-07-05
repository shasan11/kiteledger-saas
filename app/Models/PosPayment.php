<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosPayment extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'pos_sale_id',
        'payment_date',
        'payment_method',
        'account_id',
        'amount',
        'reference',
        'card_last_four',
        'transaction_no',
        'notes',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'datetime',
            'amount' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function posSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
