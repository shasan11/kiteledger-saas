<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductTaxCategory;
use App\Models\ProductUnit;
use App\Models\TaxClass;
use App\Models\TaxJurisdiction;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', env('SEED_MAIN_BRANCH_CODE', 'MAIN'))->first()
            ?: Branch::query()->where('is_head_office', true)->first()
            ?: Branch::query()->first();
        $warehouse = Warehouse::query()
            ->when($branch, fn ($query) => $query->where('branch_id', $branch->id))
            ->where('active', true)
            ->orderBy('name')
            ->first()
            ?: Warehouse::query()->where('active', true)->first();

        $salesAccount = $this->account('4100', 'Sales Income', 'coa');
        $purchaseAccount = $this->account('5100', 'Purchase Expense', 'coa');
        $salesReturnAccount = $this->account('4100', 'Sales Income', 'coa');
        $purchaseReturnAccount = $this->account('5100', 'Purchase Expense', 'coa');

        $goodsTaxCategory = $this->productTaxCategory('GOODS-13', 'Standard Goods', 'goods');
        $serviceTaxCategory = $this->productTaxCategory('SERVICE-13', 'Standard Services', 'service');
        $exemptTaxCategory = $this->productTaxCategory('EXEMPT', 'Exempt Items', 'exempt');

        $standardTaxClass = $this->taxClass('NP-VAT-13', 'Nepal VAT Standard', 'vat', 'standard');
        $exemptTaxClass = $this->taxClass('NP-EXEMPT', 'Nepal VAT Exempt', 'exempt', 'exempt');

        $products = [
            [
                'code' => 'PRD-CHAIR-001',
                'sku' => 'CHAIR-ERG-001',
                'name' => 'Ergonomic Office Chair',
                'category' => 'Goods',
                'unit' => 'PCS',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 5,
                'purchase_price' => 6500,
                'selling_price' => 9500,
            ],
            [
                'code' => 'PRD-DESK-001',
                'sku' => 'DESK-WOOD-001',
                'name' => 'Office Work Desk',
                'category' => 'Finished Goods',
                'unit' => 'PCS',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 3,
                'purchase_price' => 12000,
                'selling_price' => 18000,
            ],
            [
                'code' => 'PRD-LAPTOP-001',
                'sku' => 'LAP-I5-001',
                'name' => 'Business Laptop i5',
                'category' => 'Goods',
                'unit' => 'PCS',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 2,
                'purchase_price' => 72000,
                'selling_price' => 85000,
            ],
            [
                'code' => 'PRD-A4-REAM',
                'sku' => 'PAPER-A4-REAM',
                'name' => 'A4 Copier Paper Ream',
                'category' => 'Consumables',
                'unit' => 'PCS',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 25,
                'purchase_price' => 430,
                'selling_price' => 550,
            ],
            [
                'code' => 'PRD-KEYBOARD-001',
                'sku' => 'USB-KBD-001',
                'name' => 'USB Keyboard',
                'category' => 'Goods',
                'unit' => 'PCS',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 10,
                'purchase_price' => 750,
                'selling_price' => 1200,
            ],
            [
                'code' => 'PRD-PACK-BOX',
                'sku' => 'BOX-PACK-M',
                'name' => 'Medium Packaging Box',
                'category' => 'Consumables',
                'unit' => 'BOX',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 50,
                'purchase_price' => 35,
                'selling_price' => 55,
            ],
            [
                'code' => 'RAW-STEEL-ROD',
                'sku' => 'STEEL-ROD-KG',
                'name' => 'Steel Rod Raw Material',
                'category' => 'Raw Materials',
                'unit' => 'KG',
                'tax_category_id' => $goodsTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'reorder_level' => 250,
                'purchase_price' => 115,
                'selling_price' => 145,
                'valuation_method' => 'average_cost',
            ],
            [
                'code' => 'SRV-CONSULT-001',
                'sku' => 'CONSULT-HOUR',
                'name' => 'Business Consulting Service',
                'category' => 'Services',
                'unit' => 'HOUR',
                'tax_category_id' => $serviceTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'track_inventory' => false,
                'allow_purchase' => false,
                'product_type' => 'service',
                'purchase_price' => 0,
                'selling_price' => 3500,
            ],
            [
                'code' => 'SRV-SUPPORT-001',
                'sku' => 'SUPPORT-HOUR',
                'name' => 'Website Support Service',
                'category' => 'Services',
                'unit' => 'HOUR',
                'tax_category_id' => $serviceTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'track_inventory' => false,
                'allow_purchase' => false,
                'product_type' => 'service',
                'purchase_price' => 0,
                'selling_price' => 2500,
            ],
            [
                'code' => 'SRV-DELIVERY',
                'sku' => 'DELIVERY',
                'name' => 'Delivery Charge',
                'category' => 'Services',
                'unit' => 'SERVICE',
                'tax_category_id' => $serviceTaxCategory->id,
                'tax_class_id' => $standardTaxClass->id,
                'track_inventory' => false,
                'allow_purchase' => false,
                'product_type' => 'service',
                'purchase_price' => 0,
                'selling_price' => 500,
            ],
            [
                'code' => 'EXP-BANK-CHARGE',
                'sku' => 'BANK-CHARGE',
                'name' => 'Bank Charge Recovery',
                'category' => 'Services',
                'unit' => 'SERVICE',
                'tax_category_id' => $exemptTaxCategory->id,
                'tax_class_id' => $exemptTaxClass->id,
                'track_inventory' => false,
                'allow_purchase' => false,
                'product_type' => 'service',
                'purchase_price' => 0,
                'selling_price' => 0,
            ],
        ];

        $seededProducts = collect();

        foreach ($products as $product) {
            $category = $this->category($product['category']);
            $unit = $this->unit($product['unit']);

            $seededProducts->push(Product::updateOrCreate(
                ['code' => $product['code']],
                $this->productPayload([
                    'branch_id' => $branch?->id,
                    'product_category_id' => $category->id,
                    'product_tax_category_id' => $product['tax_category_id'],
                    'name' => $product['name'],
                    'sku' => $product['sku'],
                    'barcode' => $product['barcode'] ?? null,
                    'description' => $product['description'] ?? null,
                    'product_unit_id' => $unit->id,
                    'tax_class_id' => $product['tax_class_id'],
                    'product_type' => $product['product_type'] ?? 'simple',
                    'sales_account_id' => $salesAccount?->id,
                    'purchase_account_id' => $purchaseAccount?->id,
                    'sales_return_account_id' => $salesReturnAccount?->id,
                    'purchase_return_account_id' => $purchaseReturnAccount?->id,
                    'valuation_method' => $product['valuation_method'] ?? 'standard',
                    'reorder_level' => $product['reorder_level'] ?? 0,
                    'purchase_price' => $product['purchase_price'] ?? 0,
                    'selling_price' => $product['selling_price'] ?? 0,
                    'track_inventory' => $product['track_inventory'] ?? true,
                    'allow_sale' => $product['allow_sale'] ?? true,
                    'allow_purchase' => $product['allow_purchase'] ?? true,
                    'active' => true,
                    'is_system_generated' => true,
                ])
            ));
        }

        $this->seedOpeningStock($branch, $warehouse, $seededProducts);
    }

    private function productPayload(array $payload): array
    {
        return collect($payload)
            ->filter(fn ($value, $column) => Schema::hasColumn('products', $column))
            ->all();
    }

    private function category(string $name): ProductCategory
    {
        return ProductCategory::firstOrCreate(
            ['name' => $name],
            [
                'description' => $name . ' products',
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function unit(string $shortName): ProductUnit
    {
        return ProductUnit::firstOrCreate(
            ['short_name' => $shortName],
            [
                'name' => ucfirst(strtolower($shortName)),
                'accept_fractional' => true,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function productTaxCategory(string $code, string $name, string $type): ProductTaxCategory
    {
        return ProductTaxCategory::updateOrCreate(
            ['country_code' => 'NP', 'code' => $code],
            [
                'name' => $name,
                'tax_category_type' => $type,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function taxClass(string $code, string $name, string $type, string $behavior): TaxClass
    {
        $jurisdiction = TaxJurisdiction::where('code', 'NP-VAT')->first();

        return TaxClass::updateOrCreate(
            ['country_code' => 'NP', 'code' => $code],
            [
                'tax_jurisdiction_id' => $jurisdiction?->id,
                'name' => $name,
                'tax_type' => $type,
                'tax_behavior' => $behavior,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function account(string $code, string $name, string $nature): ?Account
    {
        return Account::firstOrCreate(
            ['code' => $code],
            [
                'name' => $name,
                'nature' => $nature,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    private function seedOpeningStock(?Branch $branch, ?Warehouse $warehouse, $products): void
    {
        if (!$warehouse || !Schema::hasTable('inventory_adjustments') || !Schema::hasTable('inventory_adjustment_lines')) {
            return;
        }

        $stockedProducts = collect($products)
            ->filter(fn (Product $product) => $product->track_inventory && $product->allow_sale && $product->product_type !== 'variant_parent')
            ->values();

        if ($stockedProducts->isEmpty()) {
            return;
        }

        InventoryAdjustment::withoutEvents(function () use ($branch, $warehouse, $stockedProducts) {
            $adjustment = InventoryAdjustment::query()->updateOrCreate(
                ['adjustment_no' => 'SEED-POS-OPENING-STOCK'],
                $this->inventoryAdjustmentPayload([
                    'branch_id' => $branch?->id,
                    'adjustment_date' => now()->toDateString(),
                    'warehouse_id' => $warehouse->id,
                    'reason' => 'Opening stock for seeded products',
                    'notes' => 'System seeded stock so POS products can be sold immediately.',
                    'status' => 'posted',
                    'active' => true,
                    'approved' => true,
                    'approved_at' => now(),
                    'exchange_rate' => 1,
                    'total' => 0,
                    'stock_posted' => true,
                    'stock_posted_at' => now(),
                ])
            );

            InventoryAdjustmentLine::query()
                ->where('inventory_adjustment_id', $adjustment->id)
                ->delete();

            $total = 0;

            foreach ($stockedProducts as $index => $product) {
                $qty = [20, 15, 10, 40, 30, 100, 250][$index] ?? 20;
                $unitCost = (float) ($product->purchase_price ?: 0);
                $total += $qty * $unitCost;

                InventoryAdjustmentLine::query()->create([
                    'inventory_adjustment_id' => $adjustment->id,
                    'product_id' => $product->id,
                    'adjustment_type' => 'increase',
                    'qty' => $qty,
                    'unit_cost' => $unitCost,
                    'remarks' => 'Seed opening balance',
                    'active' => true,
                ]);
            }

            $adjustment->forceFill($this->inventoryAdjustmentPayload(['total' => $total]))->saveQuietly();
        });
    }

    private function inventoryAdjustmentPayload(array $payload): array
    {
        return collect($payload)
            ->filter(fn ($value, $column) => Schema::hasColumn('inventory_adjustments', $column))
            ->all();
    }
}
