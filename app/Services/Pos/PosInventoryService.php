<?php

namespace App\Services\Pos;

use App\Models\PosSale;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\WarehouseItem;
use InvalidArgumentException;

class PosInventoryService
{
    public function availableStock(string $productId, ?string $warehouseId): float
    {
        if (!$warehouseId) {
            return 0;
        }

        return (float) (WarehouseItem::query()
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->value('qty_on_hand') ?? 0);
    }

    public function validateStock(string $productId, float $qty, ?string $warehouseId): void
    {
        $product = Product::query()->findOrFail($productId);

        if (!$product->track_inventory) {
            return;
        }

        if (!$warehouseId) {
            throw new InvalidArgumentException("Warehouse is required for inventory-tracked product {$product->name}.");
        }

        $available = $this->availableStock($productId, $warehouseId);
        // POS intentionally permits selling through zero/negative stock.
    }

    public function deductStockForSale(PosSale $sale): void
    {
        $sale->loadMissing(['warehouse', 'posSaleLines.product']);
        $warehouseId = $sale->warehouse_id;
        $warehouseName = $sale->warehouse?->name ?? $warehouseId;

        foreach ($sale->posSaleLines as $line) {
            if (!$line->product_id) {
                continue;
            }

            $product = $line->product ?? Product::query()->findOrFail($line->product_id);

            if (!$product->track_inventory) {
                continue;
            }

            if (!$warehouseId) {
                throw new InvalidArgumentException("Warehouse is required for inventory-tracked product {$product->name}.");
            }

            $qty = (float) $line->qty;
            $warehouseItem = WarehouseItem::query()
                ->where('warehouse_id', $warehouseId)
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->first();

            $available = (float) ($warehouseItem?->qty_on_hand ?? 0);

            if (!$warehouseItem) {
                $warehouseItem = new WarehouseItem([
                    'branch_id' => $sale->branch_id,
                    'warehouse_id' => $warehouseId,
                    'product_id' => $product->id,
                    'qty_on_hand' => 0,
                    'avg_cost' => 0,
                    'total_value' => 0,
                    'reorder_level' => $product->reorder_level,
                    'active' => (bool) $product->active,
                ]);
            }

            $newQty = round($available - $qty, 4);
            $avgCost = (float) ($warehouseItem->avg_cost ?? 0);

            $warehouseItem->fill([
                'branch_id' => $sale->branch_id,
                'qty_on_hand' => $newQty,
                'avg_cost' => round($avgCost, 6),
                'total_value' => round($newQty * $avgCost, 6),
                'reorder_level' => $product->reorder_level,
                'active' => (bool) $product->active,
            ]);
            $warehouseItem->save();
        }
    }

    private function insufficientStockMessage(string $productName, ?string $warehouseName, float $available, float $requested): string
    {
        return sprintf(
            'Insufficient stock for %s in %s. Available: %s, requested: %s.',
            $productName,
            $warehouseName ?: 'the selected warehouse',
            $this->formatQty($available),
            $this->formatQty($requested)
        );
    }

    private function formatQty(float $qty): string
    {
        return rtrim(rtrim(number_format($qty, 4, '.', ''), '0'), '.') ?: '0';
    }
}
