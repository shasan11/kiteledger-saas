<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrderByproduct extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'production_order_id', 'product_id', 'warehouse_id', 'product_unit_id',
        'quantity', 'cost_share_percent', 'allocated_cost', 'unit_cost', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'cost_share_percent' => 'decimal:4',
            'allocated_cost' => 'decimal:6',
            'unit_cost' => 'decimal:6',
        ];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function productUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class);
    }
}
