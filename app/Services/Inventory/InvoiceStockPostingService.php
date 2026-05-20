<?php

namespace App\Services\Inventory;

use App\Models\Invoice;
use App\Models\InventoryAdjustment;
use App\Models\WarehouseItem;
use Illuminate\Support\Facades\DB;

class InvoiceStockPostingService
{
    public function __construct(
        protected WarehouseStockService $warehouseStockService,
    ) {
    }

    /**
     * Create and post a system-generated InventoryAdjustment (stock decrease)
     * for an approved Invoice. Returns null when there are no inventory-tracked
     * lines or no warehouse is set on the invoice.
     *
     * Idempotent: calling multiple times for the same invoice is safe.
     */
    public function post(Invoice $invoice): ?InventoryAdjustment
    {
        if (!$invoice->warehouse_id) {
            return null;
        }

        // Quick idempotency check before acquiring any locks.
        $existing = InventoryAdjustment::where('source_type', 'invoice')
            ->where('source_id', $invoice->id)
            ->first();

        if ($existing) {
            if ($existing->stock_posted) {
                return $existing;
            }
            // Found but not yet posted — drive it through the service.
            return $this->warehouseStockService->postInventoryAdjustment($existing);
        }

        // Collect only lines whose product tracks inventory.
        $stockLines = $invoice->invoiceLines()
            ->with('product')
            ->get()
            ->filter(fn ($line) => $line->product_id && $line->product?->track_inventory)
            ->values();

        if ($stockLines->isEmpty()) {
            return null;
        }

        return DB::transaction(function () use ($invoice, $stockLines) {
            // Re-check under lock to prevent race conditions.
            $lockedExisting = InventoryAdjustment::where('source_type', 'invoice')
                ->where('source_id', $invoice->id)
                ->lockForUpdate()
                ->first();

            if ($lockedExisting) {
                return $lockedExisting->stock_posted
                    ? $lockedExisting
                    : $this->warehouseStockService->postInventoryAdjustment($lockedExisting);
            }

            $adjustment = InventoryAdjustment::create([
                'branch_id'          => $invoice->branch_id,
                'adjustment_no'      => $this->buildAdjustmentNo('INV', $invoice->id),
                'adjustment_date'    => $invoice->invoice_date ?? now()->toDateString(),
                'warehouse_id'       => $invoice->warehouse_id,
                'reason'             => 'Auto-posted from Invoice ' . ($invoice->invoice_no ?? $invoice->id),
                'status'             => 'draft',
                'approved'           => false,
                'stock_posted'       => false,
                'source_type'        => 'invoice',
                'source_id'          => $invoice->id,
                'is_system_generated' => true,
                'exchange_rate'      => $invoice->exchange_rate ?? 1,
            ]);

            foreach ($stockLines as $line) {
                $warehouseItem = WarehouseItem::where('warehouse_id', $invoice->warehouse_id)
                    ->where('product_id', $line->product_id)
                    ->first();

                $unitCost = $warehouseItem ? (float) ($warehouseItem->avg_cost ?? 0) : 0;

                $adjustment->inventoryAdjustmentLines()->create([
                    'product_id'      => $line->product_id,
                    'adjustment_type' => 'decrease',
                    'qty'             => $line->qty,
                    'unit_cost'       => $unitCost,
                    'remarks'         => 'Invoice: ' . ($line->product?->name ?? $line->product_name ?? $line->product_id),
                ]);
            }

            return $this->warehouseStockService->postInventoryAdjustment($adjustment);
        });
    }

    /**
     * Create and post a reversal InventoryAdjustment (stock increase) for a
     * voided Invoice. Returns null if no stock was ever posted for this invoice.
     *
     * Idempotent: calling multiple times for the same invoice is safe.
     */
    public function reverse(Invoice $invoice, string $reason): ?InventoryAdjustment
    {
        $original = InventoryAdjustment::where('source_type', 'invoice')
            ->where('source_id', $invoice->id)
            ->where('stock_posted', true)
            ->with('inventoryAdjustmentLines')
            ->first();

        if (!$original) {
            return null;
        }

        // Idempotency: skip if a reversal already exists and is posted.
        $existingReversal = InventoryAdjustment::where('source_type', 'invoice_reversal')
            ->where('source_id', $invoice->id)
            ->first();

        if ($existingReversal) {
            if ($existingReversal->stock_posted) {
                return $existingReversal;
            }
            return $this->warehouseStockService->postInventoryAdjustment($existingReversal);
        }

        return DB::transaction(function () use ($invoice, $original, $reason) {
            $lockedReversal = InventoryAdjustment::where('source_type', 'invoice_reversal')
                ->where('source_id', $invoice->id)
                ->lockForUpdate()
                ->first();

            if ($lockedReversal) {
                return $lockedReversal->stock_posted
                    ? $lockedReversal
                    : $this->warehouseStockService->postInventoryAdjustment($lockedReversal);
            }

            $reversal = InventoryAdjustment::create([
                'branch_id'          => $original->branch_id,
                'adjustment_no'      => $this->buildAdjustmentNo('RINV', $invoice->id),
                'adjustment_date'    => now()->toDateString(),
                'warehouse_id'       => $original->warehouse_id,
                'reason'             => $reason,
                'status'             => 'draft',
                'approved'           => false,
                'stock_posted'       => false,
                'source_type'        => 'invoice_reversal',
                'source_id'          => $invoice->id,
                'is_system_generated' => true,
                'exchange_rate'      => $original->exchange_rate ?? 1,
            ]);

            foreach ($original->inventoryAdjustmentLines as $line) {
                $reversal->inventoryAdjustmentLines()->create([
                    'product_id'      => $line->product_id,
                    'adjustment_type' => $line->adjustment_type === 'decrease' ? 'increase' : 'decrease',
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
     * Example: SYS-INV-a1b2c3d4e5f6
     */
    private function buildAdjustmentNo(string $prefix, string $sourceId): string
    {
        $hex = substr(str_replace('-', '', $sourceId), 0, 12);
        return 'SYS-' . strtoupper($prefix) . '-' . $hex;
    }
}
