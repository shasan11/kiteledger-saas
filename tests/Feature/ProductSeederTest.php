<?php

namespace Tests\Feature;

use App\Models\InventoryAdjustmentLine;
use App\Models\Product;
use App\Models\Warehouse;
use Database\Seeders\MainBranchSeeder;
use Database\Seeders\MasterProductDataSeeder;
use Database\Seeders\MasterTaxJurisdictionSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_seeder_creates_saleable_products_and_opening_stock(): void
    {
        $this->seed(MainBranchSeeder::class);
        $this->seed(MasterTaxJurisdictionSeeder::class);
        $this->seed(MasterProductDataSeeder::class);
        $this->seed(ProductSeeder::class);

        $this->assertGreaterThan(0, Product::query()->where('allow_sale', true)->count());
        $this->assertGreaterThan(0, Product::query()->where('product_type', 'service')->where('allow_sale', true)->count());

        $warehouse = Warehouse::query()->where('code', 'MAIN-WH')->firstOrFail();
        $stockedProductIds = Product::query()
            ->where('track_inventory', true)
            ->where('allow_sale', true)
            ->pluck('id');

        $this->assertGreaterThan(0, InventoryAdjustmentLine::query()
            ->whereIn('product_id', $stockedProductIds)
            ->whereHas('inventoryAdjustment', fn ($query) => $query->where('warehouse_id', $warehouse->id))
            ->count());
    }
}
