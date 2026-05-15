<?php

namespace App\Services\Inventory;

use App\Models\InventoryAdjustment;
use App\Models\InventoryConfiguration;
use App\Models\Product;
use App\Models\WarehouseItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class WarehouseStockService
{
    public function postInventoryAdjustment(InventoryAdjustment $adjustment): InventoryAdjustment
    {
        return DB::transaction(function () use ($adjustment) {
            $lockedAdjustment = InventoryAdjustment::query()
                ->with(['warehouse', 'inventoryAdjustmentLines.product'])
                ->lockForUpdate()
                ->findOrFail($adjustment->id);

            if ((bool) $lockedAdjustment->stock_posted) {
                return $lockedAdjustment;
            }

            $configurationQuery = InventoryConfiguration::query();

            if (Schema::hasColumn('inventory_configurations', 'branch_id')) {
                $configurationQuery
                    ->where(function ($query) use ($lockedAdjustment) {
                        $query->where('branch_id', $lockedAdjustment->branch_id)
                            ->orWhereNull('branch_id');
                    })
                    ->orderByRaw('branch_id is null');
            }

            $allowNegativeStock = (bool) $configurationQuery->value('negative_stock_allowed');

            foreach ($lockedAdjustment->inventoryAdjustmentLines as $line) {
                $qty = (float) $line->qty;
                $unitCost = (float) ($line->unit_cost ?? 0);
                $product = $line->product;

                $warehouseItem = WarehouseItem::query()
                    ->where('warehouse_id', $lockedAdjustment->warehouse_id)
                    ->where('product_id', $line->product_id)
                    ->lockForUpdate()
                    ->first();

                if (!$warehouseItem) {
                    $warehouseItem = new WarehouseItem([
                        'branch_id' => $lockedAdjustment->branch_id,
                        'warehouse_id' => $lockedAdjustment->warehouse_id,
                        'product_id' => $line->product_id,
                        'qty_on_hand' => 0,
                        'avg_cost' => 0,
                        'total_value' => 0,
                        'reorder_level' => $product?->reorder_level,
                        'active' => true,
                    ]);
                }

                $oldQty = (float) $warehouseItem->qty_on_hand;
                $oldAvgCost = (float) ($warehouseItem->avg_cost ?? 0);
                $newQty = $line->adjustment_type === 'decrease'
                    ? $oldQty - $qty
                    : $oldQty + $qty;

                if (!$allowNegativeStock && $newQty < -0.0001) {
                    throw ValidationException::withMessages([
                        'stock' => [
                            sprintf(
                                'Insufficient stock for %s in %s',
                                $product?->name ?? 'this product',
                                $lockedAdjustment->warehouse?->name ?? 'this warehouse'
                            ),
                        ],
                    ]);
                }

                $newAvgCost = $oldAvgCost;

                if ($line->adjustment_type === 'increase') {
                    $newAvgCost = $this->weightedAverageCost($oldQty, $oldAvgCost, $qty, $unitCost);
                }

                $warehouseItem->fill([
                    'branch_id' => $lockedAdjustment->branch_id,
                    'qty_on_hand' => round($newQty, 4),
                    'avg_cost' => round($newAvgCost, 6),
                    'total_value' => round($newQty * $newAvgCost, 6),
                    'reorder_level' => $product?->reorder_level,
                    'active' => (bool) ($product?->active ?? true),
                ]);
                $warehouseItem->save();
            }

            $lockedAdjustment->forceFill([
                'stock_posted' => true,
                'stock_posted_at' => now(),
                'status' => 'posted',
                'approved' => true,
                'approved_at' => $lockedAdjustment->approved_at ?: now(),
            ])->saveQuietly();

            return $lockedAdjustment->refresh();
        });
    }

    protected function weightedAverageCost(float $oldQty, float $oldAvgCost, float $incomingQty, float $incomingCost): float
    {
        if ($incomingQty <= 0) {
            return $oldAvgCost;
        }

        if ($oldQty <= 0) {
            return $incomingCost;
        }

        return (($oldQty * $oldAvgCost) + ($incomingQty * $incomingCost)) / ($oldQty + $incomingQty);
    }
}
