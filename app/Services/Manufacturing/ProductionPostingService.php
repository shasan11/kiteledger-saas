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

    /**
     * Approve a Production Order — sets the plan as approved and calculates costs.
     * Does NOT post stock or create a journal voucher.
     * Stock posting is handled exclusively by Production Journal.
     */
    public function approve(ProductionOrder $order, ?int $approvedById = null): ProductionOrder
    {
        return DB::transaction(function () use ($order, $approvedById) {
            $locked = ProductionOrder::query()
                ->with([
                    'finishedProduct',
                    'warehouse',
                    'rawMaterials.product',
                    'rawMaterials.warehouse',
                    'expenses.expenseAccount',
                    'byproducts.product',
                    'byproducts.warehouse',
                ])
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ((bool) $locked->void) {
                throw ValidationException::withMessages(['status' => ['Voided production orders cannot be approved.']]);
            }

            if ((bool) $locked->approved) {
                return $locked->fresh($this->freshRelations());
            }

            $this->validateForApproval($locked);

            // Resolve warehouse for lines that don't have one yet
            foreach ($locked->rawMaterials as $line) {
                $warehouseId = $line->warehouse_id ?: $locked->warehouse_id;
                if ($warehouseId && !$line->warehouse_id) {
                    $line->forceFill(['warehouse_id' => $warehouseId])->saveQuietly();
                }
            }

            foreach ($locked->byproducts as $line) {
                $warehouseId = $line->warehouse_id ?: $locked->warehouse_id;
                if ($warehouseId && !$line->warehouse_id) {
                    $line->forceFill(['warehouse_id' => $warehouseId])->saveQuietly();
                }
            }

            $locked = $this->costingService->syncLineCosts($locked->fresh(['rawMaterials', 'expenses', 'byproducts']));

            if (!$locked->code || str_starts_with((string) $locked->code, '#draft')) {
                $locked->code = app(\App\Services\DocumentNumberingService::class)->generate('production_order');
                $locked->saveQuietly();
            }

            $locked->forceFill([
                'approved'       => true,
                'approved_at'    => $locked->approved_at ?: now(),
                'approved_by_id' => $approvedById ?: $locked->approved_by_id,
                'status'         => 'approved',
            ])->saveQuietly();

            return $locked->fresh($this->freshRelations());
        });
    }

    /**
     * Void a Production Order.
     * For backward-compatibility, reverses any legacy stock entries that were
     * posted under the old behaviour (source_type = 'production_order').
     */
    public function void(ProductionOrder $order, string $reason, ?int $voidedById = null): ProductionOrder
    {
        return DB::transaction(function () use ($order, $reason, $voidedById) {
            $locked = ProductionOrder::query()->lockForUpdate()->findOrFail($order->id);

            if ((bool) $locked->void) {
                return $locked->refresh();
            }

            // Reverse any legacy ledger entries that were created under the old approval flow
            if ((bool) $locked->stock_posted) {
                $ledgers = InventoryLedger::query()
                    ->where('source_type', 'production_order')
                    ->where('source_id', $locked->id)
                    ->where('is_reversal', false)
                    ->orderByDesc('created_at')
                    ->get();

                foreach ($ledgers as $ledger) {
                    $direction = (float) $ledger->qty_in > 0 ? 'out' : 'in';
                    $qty = (float) $ledger->qty_in > 0 ? (float) $ledger->qty_in : (float) $ledger->qty_out;
                    $this->applyMovement(
                        $locked,
                        $ledger->product_id,
                        $ledger->warehouse_id,
                        $ledger->movement_type . '_reversal',
                        $qty,
                        (float) $ledger->unit_cost,
                        $direction,
                        $reason,
                        true,
                        $ledger->id
                    );
                }

                $this->journalVoucherService->reverseForSource($locked, $reason);
            }

            $locked->forceFill([
                'void'          => true,
                'voided_at'     => now(),
                'voided_by_id'  => $voidedById,
                'voided_reason' => $reason,
                'status'        => 'void',
                'active'        => false,
                'stock_posted'  => false,
            ])->saveQuietly();

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
    }

    /** Kept for void reversal of legacy records only. */
    protected function applyMovement(
        ProductionOrder $order,
        string $productId,
        ?string $warehouseId,
        string $movementType,
        float $qty,
        float $unitCost,
        string $direction,
        string $description,
        bool $isReversal = false,
        ?string $reversesLedgerId = null
    ): WarehouseItem {
        if (!$warehouseId) {
            throw ValidationException::withMessages(['warehouse_id' => ['Warehouse is required for stock reversal.']]);
        }

        $item = WarehouseItem::query()
            ->where('warehouse_id', $warehouseId)
            ->where('product_id', $productId)
            ->lockForUpdate()
            ->first();

        if (!$item) {
            $product = Product::query()->find($productId);
            $item = WarehouseItem::query()->create([
                'branch_id'     => $order->branch_id,
                'warehouse_id'  => $warehouseId,
                'product_id'    => $productId,
                'qty_on_hand'   => 0,
                'avg_cost'      => 0,
                'total_value'   => 0,
                'reorder_level' => $product?->reorder_level,
                'active'        => true,
            ]);
            $item = WarehouseItem::query()->whereKey($item->id)->lockForUpdate()->first();
        }

        $oldQty   = (float) $item->qty_on_hand;
        $oldValue = (float) $item->total_value;
        $value    = round($qty * $unitCost, 6);

        if ($direction === 'out') {
            if ($oldQty + 0.0001 < $qty) {
                throw ValidationException::withMessages(['stock' => ['Insufficient stock for production stock reversal.']]);
            }
            $newQty   = $oldQty - $qty;
            $newValue = max($oldValue - $value, 0);
        } else {
            $newQty   = $oldQty + $qty;
            $newValue = $oldValue + $value;
        }

        $newAvg = $newQty > 0 ? $newValue / $newQty : 0;

        $item->forceFill([
            'branch_id'   => $order->branch_id,
            'qty_on_hand'  => round($newQty, 4),
            'avg_cost'    => round($newAvg, 6),
            'total_value' => round($newValue, 6),
        ])->save();

        InventoryLedger::query()->create([
            'branch_id'          => $order->branch_id,
            'warehouse_id'       => $warehouseId,
            'product_id'         => $productId,
            'transaction_date'   => $order->date,
            'source_type'        => 'production_order',
            'source_id'          => $order->id,
            'source_no'          => $order->code,
            'movement_type'      => $movementType,
            'qty_in'             => $direction === 'in' ? round($qty, 4) : 0,
            'qty_out'            => $direction === 'out' ? round($qty, 4) : 0,
            'unit_cost'          => round($unitCost, 6),
            'value_in'           => $direction === 'in' ? $value : 0,
            'value_out'          => $direction === 'out' ? $value : 0,
            'balance_qty'        => round($newQty, 4),
            'balance_value'      => round($newValue, 6),
            'description'        => $description,
            'is_reversal'        => $isReversal,
            'reverses_ledger_id' => $reversesLedgerId,
        ]);

        return $item;
    }

    protected function freshRelations(): array
    {
        return [
            'finishedProduct',
            'warehouse',
            'productUnit',
            'rawMaterials.product',
            'rawMaterials.warehouse',
            'rawMaterials.productUnit',
            'expenses.expenseAccount',
            'byproducts.product',
            'byproducts.warehouse',
            'byproducts.productUnit',
            'journalVoucher',
        ];
    }

    protected function assertStockableProduct(?Product $product, string $field): void
    {
        if (!$product || $product->product_type === 'variant_parent') {
            throw ValidationException::withMessages([$field => ['Only simple products or child variant products can be used.']]);
        }
    }
}
