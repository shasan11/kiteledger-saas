<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\ProductVariantItem;
use App\Models\Variant;
use App\Models\VariantLine;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;
use App\Models\WarehouseTransferLine;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ProductSeeder::class);

        $branch = Branch::query()->where('code', 'MAIN')->first()
            ?: Branch::query()->where('code', 'HO')->first()
            ?: Branch::query()->first();

        $warehouses = $this->seedWarehouses($branch);
        $this->seedVariantProducts();
        $this->seedOpeningAdjustments($branch, $warehouses);
        $this->seedWarehouseTransfers($branch, $warehouses);
    }

    private function seedWarehouses(?Branch $branch): array
    {
        $rows = [
            [
                'code' => 'MAIN-WH',
                'name' => 'Main Warehouse',
                'address' => 'Primary inventory storage',
                'is_system_generated' => true,
            ],
            [
                'code' => 'SHOWROOM',
                'name' => 'Showroom Stock',
                'address' => 'Retail and display stock',
                'is_system_generated' => true,
            ],
            [
                'code' => 'DAMAGED',
                'name' => 'Damaged / Quarantine',
                'address' => 'Returned, damaged, or inspection stock',
                'is_system_generated' => true,
            ],
        ];

        $warehouses = [];

        foreach ($rows as $row) {
            $warehouses[$row['code']] = Warehouse::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'branch_id' => $branch?->id,
                    'name' => $row['name'],
                    'address' => $row['address'],
                    'active' => true,
                    'is_system_generated' => $row['is_system_generated'],
                ]
            );
        }

        return $warehouses;
    }

    private function seedVariantProducts(): void
    {
        $size = $this->variant('Size', ['Small', 'Medium', 'Large']);
        $color = $this->variant('Color', ['Black', 'White', 'Blue']);

        $category = ProductCategory::query()->where('name', 'Finished Goods')->first()
            ?: ProductCategory::query()->first();
        $unit = ProductUnit::query()->where('short_name', 'PCS')->first()
            ?: ProductUnit::query()->first();

        $parent = Product::query()->updateOrCreate(
            ['code' => 'PRD-POLO-PARENT'],
            [
                'product_category_id' => $category?->id,
                'name' => 'Corporate Polo Shirt',
                'sku' => 'POLO-PARENT',
                'product_unit_id' => $unit?->id,
                'product_type' => 'variant_parent',
                'valuation_method' => 'average_cost',
                'reorder_level' => 15,
                'purchase_price' => 650,
                'selling_price' => 1100,
                'track_inventory' => true,
                'allow_sale' => true,
                'allow_purchase' => true,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $variantRows = [
            ['code' => 'PRD-POLO-BLK-M', 'sku' => 'POLO-BLK-M', 'name' => 'Corporate Polo Shirt - Black / Medium', 'lines' => [$size['Medium'], $color['Black']]],
            ['code' => 'PRD-POLO-WHT-L', 'sku' => 'POLO-WHT-L', 'name' => 'Corporate Polo Shirt - White / Large', 'lines' => [$size['Large'], $color['White']]],
            ['code' => 'PRD-POLO-BLU-S', 'sku' => 'POLO-BLU-S', 'name' => 'Corporate Polo Shirt - Blue / Small', 'lines' => [$size['Small'], $color['Blue']]],
        ];

        foreach ($variantRows as $row) {
            $product = Product::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'parent_id' => $parent->id,
                    'product_category_id' => $category?->id,
                    'name' => $row['name'],
                    'sku' => $row['sku'],
                    'product_unit_id' => $unit?->id,
                    'product_type' => 'variant',
                    'valuation_method' => 'average_cost',
                    'reorder_level' => 10,
                    'purchase_price' => 650,
                    'selling_price' => 1100,
                    'track_inventory' => true,
                    'allow_sale' => true,
                    'allow_purchase' => true,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );

            ProductVariantItem::query()->where('product_id', $product->id)->delete();

            foreach ($row['lines'] as $variantLine) {
                ProductVariantItem::query()->create([
                    'product_id' => $product->id,
                    'variant_line_id' => $variantLine->id,
                ]);
            }
        }
    }

    private function seedOpeningAdjustments(?Branch $branch, array $warehouses): void
    {
        $warehouse = $warehouses['MAIN-WH'] ?? Warehouse::query()->first();

        if (!$warehouse) {
            return;
        }

        $products = Product::query()
            ->where('track_inventory', true)
            ->where('product_type', '!=', 'variant_parent')
            ->orderBy('code')
            ->limit(8)
            ->get();

        if ($products->isEmpty()) {
            return;
        }

        $adjustment = InventoryAdjustment::query()->updateOrCreate(
            ['adjustment_no' => 'DRAFT-IA-OPENING'],
            [
                'branch_id' => $branch?->id,
                'adjustment_date' => now()->toDateString(),
                'warehouse_id' => $warehouse->id,
                'reason' => 'Opening stock',
                'notes' => 'System seeded opening stock for inventory testing.',
                'status' => 'draft',
                'active' => true,
                'approved' => false,
                'exchange_rate' => 1,
                'total' => 0,
            ]
        );

        InventoryAdjustmentLine::query()
            ->where('inventory_adjustment_id', $adjustment->id)
            ->delete();

        $total = 0;

        foreach ($products as $index => $product) {
            $qty = [25, 18, 12, 50, 35, 100, 500, 16][$index] ?? 10;
            $unitCost = (float) ($product->purchase_price ?: 0);
            $total += $qty * $unitCost;

            InventoryAdjustmentLine::query()->create([
                'inventory_adjustment_id' => $adjustment->id,
                'product_id' => $product->id,
                'adjustment_type' => 'increase',
                'qty' => $qty,
                'unit_cost' => $unitCost,
                'remarks' => 'Opening balance',
                'active' => true,
            ]);
        }

        $adjustment->forceFill(['total' => $total])->save();
    }

    private function seedWarehouseTransfers(?Branch $branch, array $warehouses): void
    {
        $fromWarehouse = $warehouses['MAIN-WH'] ?? null;
        $toWarehouse = $warehouses['SHOWROOM'] ?? null;

        if (!$fromWarehouse || !$toWarehouse) {
            return;
        }

        $products = Product::query()
            ->where('track_inventory', true)
            ->where('product_type', '!=', 'variant_parent')
            ->orderBy('code')
            ->limit(3)
            ->get();

        if ($products->isEmpty()) {
            return;
        }

        $transfer = WarehouseTransfer::query()->updateOrCreate(
            ['transfer_no' => 'DRAFT-WT-SHOWROOM'],
            [
                'branch_id' => $branch?->id,
                'transfer_date' => now()->toDateString(),
                'from_warehouse_id' => $fromWarehouse->id,
                'to_warehouse_id' => $toWarehouse->id,
                'notes' => 'Draft showroom replenishment transfer.',
                'status' => 'draft',
                'active' => true,
                'approved' => false,
                'exchange_rate' => 1,
                'total' => 0,
            ]
        );

        WarehouseTransferLine::query()
            ->where('warehouse_transfer_id', $transfer->id)
            ->delete();

        $totalQty = 0;

        foreach ($products as $product) {
            $qty = 2;
            $totalQty += $qty;

            WarehouseTransferLine::query()->create([
                'warehouse_transfer_id' => $transfer->id,
                'product_id' => $product->id,
                'qty' => $qty,
                'remarks' => 'Seeded showroom transfer',
            ]);
        }

        $transfer->forceFill(['total' => $totalQty])->save();
    }

    /**
     * @return array<string, VariantLine>
     */
    private function variant(string $name, array $values): array
    {
        $variant = Variant::query()->updateOrCreate(
            ['name' => $name],
            [
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $lines = [];

        foreach ($values as $index => $value) {
            $lines[$value] = VariantLine::query()->updateOrCreate(
                [
                    'variant_id' => $variant->id,
                    'value' => $value,
                ],
                [
                    'sort_order' => $index + 1,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }

        return $lines;
    }
}
