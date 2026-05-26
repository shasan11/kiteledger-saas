<?php

namespace App\Services\Inventory;

use App\Models\InventoryAdjustment;
use App\Models\InventoryConfiguration;
use App\Models\AppSetting;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;
use App\Models\WarehouseItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class WarehouseStockService
{
    public function postWarehouseTransfer(WarehouseTransfer $transfer): WarehouseTransfer
    {
        return DB::transaction(function () use ($transfer) {
            $lockedTransfer = WarehouseTransfer::query()
                ->with(['fromWarehouse', 'toWarehouse', 'warehouseTransferLines.product'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if ((bool) $lockedTransfer->stock_posted) {
                return $lockedTransfer;
            }

            if ($lockedTransfer->from_warehouse_id === $lockedTransfer->to_warehouse_id) {
                throw ValidationException::withMessages([
                    'to_warehouse_id' => ['From warehouse and to warehouse cannot be the same.'],
                ]);
            }

            $blockNegativeStock = $this->blocksNegativeStock($lockedTransfer->branch_id);

            foreach ($lockedTransfer->warehouseTransferLines as $line) {
                $qty = (float) $line->qty;
                $product = $line->product;

                if (!$product || !(bool) ($product->track_inventory ?? true)) {
                    continue;
                }

                $sourceItem = $this->warehouseItemForUpdate(
                    $lockedTransfer->from_warehouse_id,
                    $line->product_id,
                    $lockedTransfer->branch_id,
                    $product
                );

                $available = (float) $sourceItem->qty_on_hand;

                if ($blockNegativeStock && $available - $qty < -0.0001) {
                    throw ValidationException::withMessages([
                        'stock' => [$this->insufficientStockMessage($product, $lockedTransfer->fromWarehouse, $available, $qty)],
                    ]);
                }

                $avgCost = (float) ($sourceItem->avg_cost ?? 0);
                $this->saveWarehouseItem($sourceItem, $available - $qty, $avgCost, $lockedTransfer->branch_id, $product);

                $destinationItem = $this->warehouseItemForUpdate(
                    $lockedTransfer->to_warehouse_id,
                    $line->product_id,
                    $lockedTransfer->branch_id,
                    $product
                );

                $destinationQty = (float) $destinationItem->qty_on_hand;
                $destinationAvgCost = (float) ($destinationItem->avg_cost ?? $avgCost);
                $this->saveWarehouseItem($destinationItem, $destinationQty + $qty, $destinationAvgCost ?: $avgCost, $lockedTransfer->branch_id, $product);
            }

            $lockedTransfer->forceFill([
                'stock_posted' => true,
                'stock_posted_at' => now(),
                'status' => 'posted',
                'approved' => true,
                'approved_at' => $lockedTransfer->approved_at ?: now(),
            ])->saveQuietly();

            return $lockedTransfer->refresh();
        });
    }

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

            $blockNegativeStock = $this->blocksNegativeStock($lockedAdjustment->branch_id);

            foreach ($lockedAdjustment->inventoryAdjustmentLines as $line) {
                $qty = (float) $line->qty;
                $unitCost = (float) ($line->unit_cost ?? 0);
                $product = $line->product;

                if ($product && !(bool) ($product->track_inventory ?? true)) {
                    continue;
                }

                $warehouseItem = $this->warehouseItemForUpdate(
                    $lockedAdjustment->warehouse_id,
                    $line->product_id,
                    $lockedAdjustment->branch_id,
                    $product
                );

                $oldQty = (float) $warehouseItem->qty_on_hand;
                $oldAvgCost = (float) ($warehouseItem->avg_cost ?? 0);
                $newQty = $line->adjustment_type === 'decrease'
                    ? $oldQty - $qty
                    : $oldQty + $qty;

                if ($blockNegativeStock && $newQty < -0.0001) {
                    throw ValidationException::withMessages([
                        'stock' => [$this->insufficientStockMessage($product, $lockedAdjustment->warehouse, $oldQty, $qty)],
                    ]);
                }

                $newAvgCost = $oldAvgCost;

                if ($line->adjustment_type === 'increase') {
                    $newAvgCost = $this->weightedAverageCost($oldQty, $oldAvgCost, $qty, $unitCost);
                }

                $this->saveWarehouseItem($warehouseItem, $newQty, $newAvgCost, $lockedAdjustment->branch_id, $product);
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

    protected function blocksNegativeStock(?string $branchId = null): bool
    {
        $policy = AppSetting::query()->where('active', true)->oldest()->value('negative_item_balance')
            ?: AppSetting::query()->oldest()->value('negative_item_balance');

        if ($policy) {
            return in_array(strtolower((string) $policy), ['block', 'reject'], true);
        }

        $configurationQuery = InventoryConfiguration::query();

        if (Schema::hasColumn('inventory_configurations', 'branch_id')) {
            $configurationQuery
                ->where(function ($query) use ($branchId) {
                    $query->where('branch_id', $branchId)->orWhereNull('branch_id');
                })
                ->orderByRaw('branch_id is null');
        }

        return !(bool) $configurationQuery->value('negative_stock_allowed');
    }

    protected function warehouseItemForUpdate(string $warehouseId, string $productId, ?string $branchId, ?Product $product): WarehouseItem
    {
        $warehouseItem = WarehouseItem::query()
            ->where('warehouse_id', $warehouseId)
            ->where('product_id', $productId)
            ->lockForUpdate()
            ->first();

        if ($warehouseItem) {
            return $warehouseItem;
        }

        return new WarehouseItem([
            'branch_id' => $branchId,
            'warehouse_id' => $warehouseId,
            'product_id' => $productId,
            'qty_on_hand' => 0,
            'avg_cost' => 0,
            'total_value' => 0,
            'reorder_level' => $product?->reorder_level,
            'active' => (bool) ($product?->active ?? true),
        ]);
    }

    protected function saveWarehouseItem(WarehouseItem $item, float $qty, float $avgCost, ?string $branchId, ?Product $product): void
    {
        $item->fill([
            'branch_id' => $branchId,
            'qty_on_hand' => round($qty, 4),
            'avg_cost' => round($avgCost, 6),
            'total_value' => round($qty * $avgCost, 6),
            'reorder_level' => $product?->reorder_level,
            'active' => (bool) ($product?->active ?? true),
        ]);
        $item->save();
    }

    protected function insufficientStockMessage(?Product $product, ?Warehouse $warehouse, float $available, float $requested): string
    {
        return sprintf(
            'Insufficient stock for %s in %s. Available: %s, requested: %s.',
            $product?->name ?? 'this product',
            $warehouse?->name ?? 'the selected warehouse',
            $this->formatQty($available),
            $this->formatQty($requested)
        );
    }

    protected function formatQty(float $qty): string
    {
        return rtrim(rtrim(number_format($qty, 4, '.', ''), '0'), '.') ?: '0';
    }
}
