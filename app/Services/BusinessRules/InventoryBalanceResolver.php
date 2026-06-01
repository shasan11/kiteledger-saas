<?php

namespace App\Services\BusinessRules;

use App\Models\Product;
use App\Models\WarehouseItem;

class InventoryBalanceResolver
{
    public function currentStock(?string $productId, ?string $warehouseId): float
    {
        if (!$productId || !$warehouseId) {
            return 0.0;
        }

        return (float) WarehouseItem::query()
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->value('qty_on_hand');
    }

    public function product(?string $productId): ?Product
    {
        return $productId ? Product::query()->find($productId) : null;
    }

    public function tracksInventory(?Product $product): bool
    {
        return $product && (bool) ($product->track_inventory ?? true);
    }
}
