<?php

namespace App\Services\Manufacturing;

use App\Models\InventoryLedger;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\WarehouseItem;
use App\Services\ParallelJournalVoucherService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionPostingService
{
    public function __construct(
        protected ProductionCostingService $costingService,
        protected ParallelJournalVoucherService $journalVoucherService,
    ) {
    }

    public function approve(ProductionOrder $order, ?int $approvedById = null): ProductionOrder
    {
        return DB::transaction(function () use ($order, $approvedById) {
            $locked = ProductionOrder::query()
                ->with(['finishedProduct', 'warehouse', 'rawMaterials.product', 'rawMaterials.warehouse', 'expenses.expenseAccount', 'byproducts.product', 'byproducts.warehouse'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ((bool) $locked->void) {
                throw ValidationException::withMessages(['status' => ['Voided production orders cannot be approved.']]);
            }

            if ((bool) $locked->stock_posted) {
                return $locked->refresh();
            }

            $this->validateForApproval($locked);
            $rawMaterialCost = 0.0;

            foreach ($locked->rawMaterials as $line) {
                $warehouseId = $line->warehouse_id ?: $locked->warehouse_id;
                $item = $this->warehouseItem($locked, $line->product_id, $warehouseId, true);
                $qty = (float) $line->quantity;
                $unitCost = (float) ($line->unit_cost ?: $item->avg_cost ?: 0);

                if ((float) $item->qty_on_hand + 0.0001 < $qty) {
                    throw ValidationException::withMessages([
                        'stock' => [sprintf(
                            'Insufficient stock for %s. Available: %s, required: %s.',
                            $line->product?->name ?? 'raw material',
                            number_format((float) $item->qty_on_hand, 4, '.', ''),
                            number_format($qty, 4, '.', '')
                        )],
                    ]);
                }

                $line->forceFill([
                    'warehouse_id' => $warehouseId,
                    'unit_cost' => round($unitCost, 6),
                    'total_cost' => round($qty * $unitCost, 6),
                ])->saveQuietly();

                $rawMaterialCost += $qty * $unitCost;
            }

            $locked = $locked->fresh(['rawMaterials', 'expenses', 'byproducts']);
            $locked->forceFill(['total_raw_material_cost' => round($rawMaterialCost, 6)])->saveQuietly();
            $locked = $this->costingService->syncLineCosts($locked);

            if (!$locked->code || str_starts_with((string) $locked->code, '#draft')) {
                $locked->code = app(\App\Services\DocumentNumberingService::class)->generate('production_order');
                $locked->saveQuietly();
            }

            foreach ($locked->rawMaterials as $line) {
                $this->applyMovement($locked, $line->product_id, $line->warehouse_id ?: $locked->warehouse_id, 'production_order_raw_consumed', (float) $line->quantity, (float) $line->unit_cost, 'out', 'Raw material consumed');
            }

            $this->applyMovement($locked, $locked->finished_product_id, $locked->warehouse_id, 'production_order_finished_goods', (float) $locked->output_quantity, (float) $locked->finished_goods_unit_cost, 'in', 'Finished goods produced');

            foreach ($locked->byproducts as $line) {
                $warehouseId = $line->warehouse_id ?: $locked->warehouse_id;
                $this->applyMovement($locked, $line->product_id, $warehouseId, 'production_order_byproduct', (float) $line->quantity, (float) $line->unit_cost, 'in', 'By-product produced');
                $line->forceFill(['warehouse_id' => $warehouseId])->saveQuietly();
            }

            $locked->forceFill([
                'approved' => true,
                'approved_at' => $locked->approved_at ?: now(),
                'approved_by_id' => $approvedById ?: $locked->approved_by_id,
                'status' => 'approved',
                'stock_posted' => true,
                'stock_posted_at' => now(),
            ])->saveQuietly();

            $this->journalVoucherService->createForApprovedSource($locked->refresh());

            return $locked->fresh(['finishedProduct', 'warehouse', 'productUnit', 'rawMaterials.product', 'rawMaterials.warehouse', 'rawMaterials.productUnit', 'expenses.expenseAccount', 'byproducts.product', 'byproducts.warehouse', 'byproducts.productUnit', 'journalVoucher']);
        });
    }

    public function void(ProductionOrder $order, string $reason, ?int $voidedById = null): ProductionOrder
    {
        return DB::transaction(function () use ($order, $reason, $voidedById) {
            $locked = ProductionOrder::query()->lockForUpdate()->findOrFail($order->id);

            if ((bool) $locked->void) {
                return $locked->refresh();
            }

            $ledgers = InventoryLedger::query()
                ->where('source_type', 'production_order')
                ->where('source_id', $locked->id)
                ->where('is_reversal', false)
                ->orderByDesc('created_at')
                ->get();

            foreach ($ledgers as $ledger) {
                $direction = (float) $ledger->qty_in > 0 ? 'out' : 'in';
                $qty = (float) $ledger->qty_in > 0 ? (float) $ledger->qty_in : (float) $ledger->qty_out;
                $this->applyMovement($locked, $ledger->product_id, $ledger->warehouse_id, $ledger->movement_type . '_reversal', $qty, (float) $ledger->unit_cost, $direction, $reason, true, $ledger->id);
            }

            $locked->forceFill([
                'void' => true,
                'voided_at' => now(),
                'voided_by_id' => $voidedById,
                'voided_reason' => $reason,
                'status' => 'void',
                'active' => false,
                'stock_posted' => false,
            ])->saveQuietly();

            $this->journalVoucherService->reverseForSource($locked, $reason);

            return $locked->fresh(['finishedProduct', 'warehouse', 'productUnit', 'rawMaterials.product', 'expenses.expenseAccount', 'byproducts.product', 'journalVoucher']);
        });
    }

    protected function validateForApproval(ProductionOrder $order): void
    {
        $this->assertStockableProduct($order->finishedProduct, 'finished_product_id');

        if ((bool) ($order->finishedProduct?->track_inventory ?? true) && empty($order->warehouse_id)) {
            throw ValidationException::withMessages(['warehouse_id' => ['Warehouse is required when finished product tracks inventory.']]);
        }

        if ($order->rawMaterials->isEmpty()) {
            throw ValidationException::withMessages(['raw_materials' => ['Raw materials are required before approval.']]);
        }

        foreach ($order->rawMaterials as $line) {
            $this->assertStockableProduct($line->product, 'raw_materials');
        }

        foreach ($order->byproducts as $line) {
            $this->assertStockableProduct($line->product, 'byproducts');
        }

        $this->costingService->calculate($order);
    }

    protected function applyMovement(ProductionOrder $order, string $productId, ?string $warehouseId, string $movementType, float $qty, float $unitCost, string $direction, string $description, bool $isReversal = false, ?string $reversesLedgerId = null): WarehouseItem
    {
        if (!$warehouseId) {
            throw ValidationException::withMessages(['warehouse_id' => ['Warehouse is required for stock posting.']]);
        }

        $item = $this->warehouseItem($order, $productId, $warehouseId);
        $oldQty = (float) $item->qty_on_hand;
        $oldValue = (float) $item->total_value;
        $value = round($qty * $unitCost, 6);

        if ($direction === 'out') {
            if ($oldQty + 0.0001 < $qty) {
                throw ValidationException::withMessages(['stock' => ['Insufficient stock for production stock movement.']]);
            }
            $newQty = $oldQty - $qty;
            $newValue = max($oldValue - $value, 0);
        } else {
            $newQty = $oldQty + $qty;
            $newValue = $oldValue + $value;
        }

        $newAvg = $newQty > 0 ? $newValue / $newQty : 0;

        $item->forceFill([
            'branch_id' => $order->branch_id,
            'qty_on_hand' => round($newQty, 4),
            'avg_cost' => round($newAvg, 6),
            'total_value' => round($newValue, 6),
        ])->save();

        InventoryLedger::query()->create([
            'branch_id' => $order->branch_id,
            'warehouse_id' => $warehouseId,
            'product_id' => $productId,
            'transaction_date' => $order->date,
            'source_type' => 'production_order',
            'source_id' => $order->id,
            'source_no' => $order->code,
            'movement_type' => $movementType,
            'qty_in' => $direction === 'in' ? round($qty, 4) : 0,
            'qty_out' => $direction === 'out' ? round($qty, 4) : 0,
            'unit_cost' => round($unitCost, 6),
            'value_in' => $direction === 'in' ? $value : 0,
            'value_out' => $direction === 'out' ? $value : 0,
            'balance_qty' => round($newQty, 4),
            'balance_value' => round($newValue, 6),
            'description' => $description,
            'is_reversal' => $isReversal,
            'reverses_ledger_id' => $reversesLedgerId,
        ]);

        return $item;
    }

    protected function warehouseItem(ProductionOrder $order, string $productId, string $warehouseId, bool $mustExist = false): WarehouseItem
    {
        $item = WarehouseItem::query()->where('warehouse_id', $warehouseId)->where('product_id', $productId)->lockForUpdate()->first();

        if (!$item && $mustExist) {
            throw ValidationException::withMessages(['stock' => ['Raw material stock does not exist in selected warehouse.']]);
        }

        if (!$item) {
            $product = Product::query()->find($productId);
            $item = WarehouseItem::query()->create([
                'branch_id' => $order->branch_id,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'qty_on_hand' => 0,
                'avg_cost' => 0,
                'total_value' => 0,
                'reorder_level' => $product?->reorder_level,
                'active' => true,
            ]);
            $item = WarehouseItem::query()->whereKey($item->id)->lockForUpdate()->first();
        }

        return $item;
    }

    protected function assertStockableProduct(?Product $product, string $field): void
    {
        if (!$product || $product->product_type === 'variant_parent') {
            throw ValidationException::withMessages([$field => ['Only simple products or child variant products can be used.']]);
        }
    }
}
