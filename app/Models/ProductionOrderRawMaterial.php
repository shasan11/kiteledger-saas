<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrderRawMaterial extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'production_order_id', 'product_id', 'warehouse_id', 'product_unit_id',
        'quantity', 'unit_cost', 'total_cost', 'notes',
    ];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:4', 'unit_cost' => 'decimal:6', 'total_cost' => 'decimal:6'];
    }

    public function productionOrder(): BelongsTo { return $this->belongsTo(ProductionOrder::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function productUnit(): BelongsTo { return $this->belongsTo(ProductUnit::class); }
}
