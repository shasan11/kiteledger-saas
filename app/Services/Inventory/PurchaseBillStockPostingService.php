<?php

namespace App\Services\Inventory;

use App\Models\PurchaseBill;
use App\Models\InventoryAdjustment;
use Illuminate\Support\Facades\DB;

class PurchaseBillStockPostingService
{
    public function __construct(
        protected WarehouseStockService $warehouseStockService,
    ) {
    }

    /**
     * Create and post a system-generated InventoryAdjustment (stock increase)
     * for an approved PurchaseBill. Returns null when there are no
     * inventory-tracked lines or no warehouse is set on the bill.
     *
     * Idempotent: calling multiple times for the same bill is safe.
     */
    public function post(PurchaseBill $bill): ?InventoryAdjustment
    {
        if (!$bill->warehouse_id) {
            return null;
        }

        // Quick idempotency check before acquiring any locks.
        $existing = InventoryAdjustment::where('source_type', 'purchase_bill')
            ->where('source_id', $bill->id)
            ->first();

        if ($existing) {
            if ($existing->stock_posted) {
                return $existing;
            }
            return $this->warehouseStockService->postInventoryAdjustment($existing);
        }

        // Collect only lines whose product tracks inventory.
        $stockLines = $bill->purchaseBillLines()
            ->with('product')
            ->get()
            ->filter(fn ($line) => $line->product_id && $line->product?->track_inventory)
            ->values();

        if ($stockLines->isEmpty()) {
            return null;
        }

        return DB::transaction(function () use ($bill, $stockLines) {
            // Re-check under lock to prevent race conditions.
            $lockedExisting = InventoryAdjustment::where('source_type', 'purchase_bill')
                ->where('source_id', $bill->id)
                ->lockForUpdate()
                ->first();

            if ($lockedExisting) {
                return $lockedExisting->stock_posted
                    ? $lockedExisting
                    : $this->warehouseStockService->postInventoryAdjustment($lockedExisting);
            }

            $adjustment = InventoryAdjustment::create([
                'branch_id'           => $bill->branch_id,
                'adjustment_no'       => $this->buildAdjustmentNo('BILL', $bill->id),
                'adjustment_date'     => $bill->bill_date ?? now()->toDateString(),
                'warehouse_id'        => $bill->warehouse_id,
                'reason'              => 'Auto-posted from Purchase Bill ' . ($bill->bill_no ?? $bill->id),
                'status'              => 'draft',
                'approved'            => false,
                'stock_posted'        => false,
                'source_type'         => 'purchase_bill',
                'source_id'           => $bill->id,
                'is_system_generated' => true,
                'exchange_rate'       => $bill->exchange_rate ?? 1,
            ]);

            foreach ($stockLines as $line) {
                // Use the purchase line's unit_price as the incoming cost so
                // WarehouseStockService can compute a new weighted-average cost.
                $adjustment->inventoryAdjustmentLines()->create([
                    'product_id'      => $line->product_id,
                    'adjustment_type' => 'increase',
                    'qty'             => $line->qty,
                    'unit_cost'       => (float) ($line->unit_price ?? 0),
                    'remarks'         => 'Purchase Bill: ' . ($line->product?->name ?? $line->product_name ?? $line->product_id),
                ]);
            }

            return $this->warehouseStockService->postInventoryAdjustment($adjustment);
        });
    }

    /**
     * Create and post a reversal InventoryAdjustment (stock decrease) for a
     * voided PurchaseBill. Returns null if no stock was ever posted for this bill.
     *
     * Idempotent: calling multiple times for the same bill is safe.
     */
    public function reverse(PurchaseBill $bill, string $reason): ?InventoryAdjustment
    {
        $original = InventoryAdjustment::where('source_type', 'purchase_bill')
            ->where('source_id', $bill->id)
            ->where('stock_posted', true)
            ->with('inventoryAdjustmentLines')
            ->first();

        if (!$original) {
            return null;
        }

        $existingReversal = InventoryAdjustment::where('source_type', 'purchase_bill_reversal')
            ->where('source_id', $bill->id)
            ->first();

        if ($existingReversal) {
            if ($existingReversal->stock_posted) {
                return $existingReversal;
            }
            return $this->warehouseStockService->postInventoryAdjustment($existingReversal);
        }

        return DB::transaction(function () use ($bill, $original, $reason) {
            $lockedReversal = InventoryAdjustment::where('source_type', 'purchase_bill_reversal')
                ->where('source_id', $bill->id)
                ->lockForUpdate()
                ->first();

            if ($lockedReversal) {
                return $lockedReversal->stock_posted
                    ? $lockedReversal
                    : $this->warehouseStockService->postInventoryAdjustment($lockedReversal);
            }

            $reversal = InventoryAdjustment::create([
                'branch_id'           => $original->branch_id,
                'adjustment_no'       => $this->buildAdjustmentNo('RBILL', $bill->id),
                'adjustment_date'     => now()->toDateString(),
                'warehouse_id'        => $original->warehouse_id,
                'reason'              => $reason,
                'status'              => 'draft',
                'approved'            => false,
                'stock_posted'        => false,
                'source_type'         => 'purchase_bill_reversal',
                'source_id'           => $bill->id,
                'is_system_generated' => true,
                'exchange_rate'       => $original->exchange_rate ?? 1,
            ]);

            foreach ($original->inventoryAdjustmentLines as $line) {
                $reversal->inventoryAdjustmentLines()->create([
                    'product_id'      => $line->product_id,
                    'adjustment_type' => $line->adjustment_type === 'increase' ? 'decrease' : 'increase',
                    'qty'             => $line->qty,
                    'unit_cost'       => $line->unit_cost,
                    'remarks'         => 'Reversal — ' . $reason,
                ]);
            }

            return $this->warehouseStockService->postInventoryAdjustment($reversal);
        });
    }

    /**
     * Build a deterministic, compact adjustment number for system records.
     * Format: SYS-{PREFIX}-{first 12 hex chars of source UUID}
     * Example: SYS-BILL-a1b2c3d4e5f6
     */
    private function buildAdjustmentNo(string $prefix, string $sourceId): string
    {
        $hex = substr(str_replace('-', '', $sourceId), 0, 12);
        return 'SYS-' . strtoupper($prefix) . '-' . $hex;
    }
}
