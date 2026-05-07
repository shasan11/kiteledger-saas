<?php

namespace App\Services\Pos;

use App\Models\AppSetting;
use App\Models\InventoryAdjustmentLine;
use App\Models\PosReturnLine;
use App\Models\PosSaleLine;
use App\Models\Product;
use App\Models\WarehouseTransferLine;
use InvalidArgumentException;

class PosInventoryService
{
    public function availableStock(string $productId, ?string $warehouseId): float
    {
        if (!$warehouseId) {
            return 0;
        }

        $adjustments = InventoryAdjustmentLine::query()
            ->where('product_id', $productId)
            ->whereHas('inventoryAdjustment', function ($query) use ($warehouseId) {
                $query->where('warehouse_id', $warehouseId)
                    ->whereNotIn('status', ['cancelled'])
                    ->where(function ($q) {
                        $q->whereNull('void')->orWhere('void', false);
                    });
            })
            ->get()
            ->sum(function ($line) {
                $qty = (float) $line->qty;
                return $line->adjustment_type === 'decrease' ? -$qty : $qty;
            });

        $transfersOut = WarehouseTransferLine::query()
            ->where('product_id', $productId)
            ->whereHas('warehouseTransfer', function ($query) use ($warehouseId) {
                $query->where('from_warehouse_id', $warehouseId)
                    ->whereNotIn('status', ['cancelled'])
                    ->where(function ($q) {
                        $q->whereNull('void')->orWhere('void', false);
                    });
            })
            ->sum('qty');

        $transfersIn = WarehouseTransferLine::query()
            ->where('product_id', $productId)
            ->whereHas('warehouseTransfer', function ($query) use ($warehouseId) {
                $query->where('to_warehouse_id', $warehouseId)
                    ->whereNotIn('status', ['cancelled'])
                    ->where(function ($q) {
                        $q->whereNull('void')->orWhere('void', false);
                    });
            })
            ->sum('qty');

        $posSales = PosSaleLine::query()
            ->where('product_id', $productId)
            ->whereHas('posSale', function ($query) use ($warehouseId) {
                $query->where('warehouse_id', $warehouseId)
                    ->whereIn('status', ['completed', 'part_refunded', 'refunded'])
                    ->where('void', false);
            })
            ->sum('qty');

        $posReturns = PosReturnLine::query()
            ->where('product_id', $productId)
            ->whereHas('posReturn.posSale', function ($query) use ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            })
            ->whereHas('posReturn', function ($query) {
                $query->where('status', 'completed');
            })
            ->sum('qty');

        return round((float) $adjustments + (float) $transfersIn - (float) $transfersOut - (float) $posSales + (float) $posReturns, 4);
    }

    public function validateStock(string $productId, float $qty, ?string $warehouseId): void
    {
        $product = Product::query()->findOrFail($productId);

        if (!$product->track_inventory) {
            return;
        }

        $available = $this->availableStock($productId, $warehouseId);
        $policy = AppSetting::query()->value('negative_item_balance') ?: 'warn';

        if ($available - $qty < 0 && $policy === 'reject') {
            throw new InvalidArgumentException("Insufficient stock for {$product->name}. Available: {$available}");
        }
    }
}
