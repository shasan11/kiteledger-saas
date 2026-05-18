<?php

namespace App\Services\Inventory;

use App\Models\InventoryLedger;
use App\Models\Product;
use App\Models\ProductionJournal;
use App\Models\WarehouseItem;
use App\Services\ParallelJournalVoucherService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionPostingService
{
    public function __construct(
        protected ParallelJournalVoucherService $journalVoucherService,
    ) {
    }

    public function post(ProductionJournal $journal): ProductionJournal
    {
        return DB::transaction(function () use ($journal) {
            $locked = ProductionJournal::query()
                ->with([
                    'warehouse',
                    'finishedProduct',
                    'rawMaterials.product',
                    'productionExpenses.costTerm.chartOfAccount',
                    'byProducts.product',
                ])
                ->lockForUpdate()
                ->findOrFail($journal->id);

            if ((bool) $locked->void) {
                throw ValidationException::withMessages([
                    'status' => ['Voided production journals cannot be posted.'],
                ]);
            }

            if ((bool) $locked->stock_posted) {
                return $locked;
            }

            $this->assertStockableProduct($locked->finishedProduct, 'finished_product_id');
            $rawMaterialCost = 0.0;

            foreach ($locked->rawMaterials as $line) {
                $this->assertStockableProduct($line->product, 'raw_materials');
                $item = $this->warehouseItem($locked, $line->product_id, true);
                $qty = (float) $line->quantity;
                $available = (float) $item->qty_on_hand;

                if ($available + 0.0001 < $qty) {
                    throw ValidationException::withMessages([
                        'stock' => [sprintf(
                            'Insufficient stock for %s in %s. Available: %s, required: %s.',
                            $line->product?->name ?? 'raw material',
                            $locked->warehouse?->name ?? 'warehouse',
                            number_format($available, 4, '.', ''),
                            number_format($qty, 4, '.', '')
                        )],
                    ]);
                }

                $unitCost = (float) ($item->avg_cost ?? 0);
                $amount = round($qty * $unitCost, 6);
                $rawMaterialCost += $amount;

                $line->forceFill([
                    'rate' => round($unitCost, 6),
                    'amount' => $amount,
                ])->saveQuietly();
            }

            $productionExpenseAmount = (float) $locked->productionExpenses->sum('amount');
            $totalProductionCost = $rawMaterialCost + $productionExpenseAmount;
            $byProductAllocatedCost = 0.0;

            foreach ($locked->byProducts as $line) {
                $this->assertStockableProduct($line->product, 'by_products');
                $allocated = round($totalProductionCost * ((float) $line->cost_percent / 100), 6);
                $byProductAllocatedCost += $allocated;
                $line->forceFill(['allocated_cost' => $allocated])->saveQuietly();
            }

            if ($byProductAllocatedCost > $totalProductionCost + 0.0001) {
                throw ValidationException::withMessages([
                    'by_products' => ['By-product cost allocation cannot exceed total production cost.'],
                ]);
            }

            $finishedGoodsCost = max($totalProductionCost - $byProductAllocatedCost, 0);
            $outputQty = (float) $locked->output_quantity;

            if ($outputQty <= 0) {
                throw ValidationException::withMessages([
                    'output_quantity' => ['Output quantity must be greater than zero.'],
                ]);
            }

            foreach ($locked->rawMaterials as $line) {
                $this->applyMovement(
                    journal: $locked,
                    productId: $line->product_id,
                    movementType: 'production_raw_consumed',
                    qty: (float) $line->quantity,
                    unitCost: (float) $line->rate,
                    direction: 'out',
                    description: 'Raw material consumed'
                );
            }

            $this->applyMovement(
                journal: $locked,
                productId: $locked->finished_product_id,
                movementType: 'production_finished_goods',
                qty: $outputQty,
                unitCost: $finishedGoodsCost / $outputQty,
                direction: 'in',
                description: 'Finished goods produced'
            );

            foreach ($locked->byProducts as $line) {
                $qty = (float) $line->quantity;
                if ($qty <= 0) {
                    continue;
                }

                $this->applyMovement(
                    journal: $locked,
                    productId: $line->product_id,
                    movementType: 'production_by_product',
                    qty: $qty,
                    unitCost: ((float) $line->allocated_cost) / $qty,
                    direction: 'in',
                    description: 'By-product produced'
                );
            }

            $locked->forceFill([
                'raw_material_cost' => round($rawMaterialCost, 6),
                'production_expense_amount' => round($productionExpenseAmount, 6),
                'total_cost_of_production' => round($totalProductionCost, 6),
                'by_product_allocated_cost' => round($byProductAllocatedCost, 6),
                'finished_goods_cost' => round($finishedGoodsCost, 6),
                'cost_per_unit' => round($finishedGoodsCost / $outputQty, 6),
                'stock_posted' => true,
                'stock_posted_at' => now(),
                'approved' => true,
                'approved_at' => $locked->approved_at ?: now(),
                'status' => 'posted',
            ])->saveQuietly();

            $this->journalVoucherService->createForApprovedSource($locked->refresh());

            return $locked->fresh([
                'warehouse',
                'finishedProduct',
                'rawMaterials.product',
                'productionExpenses.costTerm',
                'byProducts.product',
                'inventoryLedgers',
                'journalVoucher',
            ]);
        });
    }

    public function reverse(ProductionJournal $journal, ?string $reason = null, ?int $voidedById = null): ProductionJournal
    {
        return DB::transaction(function () use ($journal, $reason, $voidedById) {
            $locked = ProductionJournal::query()
                ->with(['inventoryLedgers'])
                ->lockForUpdate()
                ->findOrFail($journal->id);

            if ((bool) $locked->void) {
                return $locked;
            }

            $ledgers = InventoryLedger::query()
                ->where('source_type', 'production_journal')
                ->where('source_id', $locked->id)
                ->where('is_reversal', false)
                ->orderByDesc('created_at')
                ->get();

            foreach ($ledgers as $ledger) {
                $direction = (float) $ledger->qty_in > 0 ? 'out' : 'in';
                $qty = (float) $ledger->qty_in > 0 ? (float) $ledger->qty_in : (float) $ledger->qty_out;

                $this->applyMovement(
                    journal: $locked,
                    productId: $ledger->product_id,
                    movementType: $ledger->movement_type . '_reversal',
                    qty: $qty,
                    unitCost: (float) $ledger->unit_cost,
                    direction: $direction,
                    description: $reason ?: 'Production journal reversed',
                    isReversal: true,
                    reversesLedgerId: $ledger->id
                );
            }

            $locked->forceFill([
                'void' => true,
                'voided_at' => now(),
                'voided_by_id' => $voidedById,
                'voided_reason' => $reason ?: 'Production journal voided',
                'active' => false,
                'status' => 'cancelled',
                'stock_posted' => false,
            ])->saveQuietly();

            $this->journalVoucherService->reverseForSource($locked, $reason ?: 'Production journal voided');

            return $locked->fresh([
                'warehouse',
                'finishedProduct',
                'rawMaterials.product',
                'productionExpenses.costTerm',
                'byProducts.product',
                'inventoryLedgers',
                'journalVoucher',
            ]);
        });
    }

    protected function applyMovement(
        ProductionJournal $journal,
        string $productId,
        string $movementType,
        float $qty,
        float $unitCost,
        string $direction,
        string $description,
        bool $isReversal = false,
        ?string $reversesLedgerId = null
    ): WarehouseItem {
        $item = $this->warehouseItem($journal, $productId);
        $oldQty = (float) $item->qty_on_hand;
        $oldValue = (float) ($item->total_value ?? 0);
        $value = round($qty * $unitCost, 6);

        if ($direction === 'out') {
            if ($oldQty + 0.0001 < $qty) {
                $productName = Product::query()->whereKey($productId)->value('name') ?: 'product';
                throw ValidationException::withMessages([
                    'stock' => ["Insufficient stock to reverse or post production for {$productName}."],
                ]);
            }

            $newQty = $oldQty - $qty;
            $newValue = max($oldValue - $value, 0);
        } else {
            $newQty = $oldQty + $qty;
            $newValue = $oldValue + $value;
        }

        $newAvg = $newQty > 0 ? $newValue / $newQty : 0;

        $item->forceFill([
            'branch_id' => $journal->branch_id,
            'qty_on_hand' => round($newQty, 4),
            'avg_cost' => round($newAvg, 6),
            'total_value' => round($newValue, 6),
        ])->save();

        InventoryLedger::query()->create([
            'branch_id' => $journal->branch_id,
            'warehouse_id' => $journal->warehouse_id,
            'product_id' => $productId,
            'transaction_date' => $journal->date,
            'source_type' => 'production_journal',
            'source_id' => $journal->id,
            'source_no' => $journal->code,
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

    protected function warehouseItem(ProductionJournal $journal, string $productId, bool $mustExist = false): WarehouseItem
    {
        $item = WarehouseItem::query()
            ->where('warehouse_id', $journal->warehouse_id)
            ->where('product_id', $productId)
            ->lockForUpdate()
            ->first();

        if (!$item && $mustExist) {
            throw ValidationException::withMessages([
                'stock' => ['Raw material stock does not exist in selected warehouse.'],
            ]);
        }

        if (!$item) {
            $product = Product::query()->find($productId);
            $item = WarehouseItem::query()->create([
                'branch_id' => $journal->branch_id,
                'warehouse_id' => $journal->warehouse_id,
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
            throw ValidationException::withMessages([
                $field => ['Use a simple product or a child variant product. Variant parents cannot be stocked.'],
            ]);
        }
    }
}
