<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryLedger extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'branch_id',
        'warehouse_id',
        'product_id',
        'transaction_date',
        'source_type',
        'source_id',
        'source_no',
        'movement_type',
        'qty_in',
        'qty_out',
        'unit_cost',
        'value_in',
        'value_out',
        'balance_qty',
        'balance_value',
        'description',
        'is_reversal',
        'reverses_ledger_id',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'qty_in' => 'decimal:4',
            'qty_out' => 'decimal:4',
            'unit_cost' => 'decimal:6',
            'value_in' => 'decimal:6',
            'value_out' => 'decimal:6',
            'balance_qty' => 'decimal:4',
            'balance_value' => 'decimal:6',
            'is_reversal' => 'boolean',
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

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
