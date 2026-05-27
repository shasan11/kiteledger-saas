<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosTerminal extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'warehouse_id',
        'name',
        'code',
        'location',
        'floor_name',
        'x_position',
        'y_position',
        'sort_order',
        'status',
        'receipt_printer_name',
        'cash_account_id',
        'card_account_id',
        'online_account_id',
        'default_customer_id',
        'is_default',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
            'x_position' => 'integer',
            'y_position' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'cash_account_id');
    }

    public function cardAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'card_account_id');
    }

    public function onlineAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'online_account_id');
    }

    public function defaultCustomer(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'default_customer_id');
    }

    public function posShifts(): HasMany
    {
        return $this->hasMany(PosShift::class);
    }

    public function posSales(): HasMany
    {
        return $this->hasMany(PosSale::class);
    }
}
