<?php

namespace Tests\Feature;

use App\Models\InventoryAdjustment;
use App\Models\InventoryConfiguration;
use App\Models\DocumentNumbering;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;
use App\Models\WarehouseItem;
use App\Services\Inventory\WarehouseStockService;
use App\Services\TransactionApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class WarehouseStockPostingTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_adjustment_posts_to_one_warehouse_item_and_is_idempotent(): void
    {
        InventoryConfiguration::query()->create(['negative_stock_allowed' => false]);
        $warehouse = Warehouse::factory()->create();
        $product = Product::query()->create(['name' => 'Product X', 'code' => 'PX', 'purchase_price' => 100, 'reorder_level' => 3]);

        $adjustment = InventoryAdjustment::query()->create([
            'adjustment_no' => 'IA-' . str()->uuid(),
            'adjustment_date' => '2026-05-14',
            'warehouse_id' => $warehouse->id,
            'status' => 'draft',
            'approved' => false,
        ]);
        $adjustment->inventoryAdjustmentLines()->create([
            'product_id' => $product->id,
            'adjustment_type' => 'increase',
            'qty' => 10,
            'unit_cost' => 100,
        ]);

        app(WarehouseStockService::class)->postInventoryAdjustment($adjustment);
        app(WarehouseStockService::class)->postInventoryAdjustment($adjustment->fresh());

        $item = WarehouseItem::query()->where('warehouse_id', $warehouse->id)->where('product_id', $product->id)->sole();
        $this->assertSame('10.0000', $item->qty_on_hand);
        $this->assertSame('100.000000', $item->avg_cost);
        $this->assertSame(1, WarehouseItem::query()->where('warehouse_id', $warehouse->id)->where('product_id', $product->id)->count());
    }

    public function test_inventory_adjustment_increases_decreases_and_keeps_warehouses_separate(): void
    {
        InventoryConfiguration::query()->create(['negative_stock_allowed' => false]);
        $warehouseA = Warehouse::factory()->create();
        $warehouseB = Warehouse::factory()->create();
        $product = Product::query()->create(['name' => 'Product X', 'code' => 'PX']);

        $this->postLine($warehouseA, $product, 'increase', 10, 100);
        $this->postLine($warehouseA, $product, 'increase', 5, 200);
        $this->postLine($warehouseA, $product, 'decrease', 4, 0);
        $this->postLine($warehouseB, $product, 'increase', 7, 50);

        $a = WarehouseItem::query()->where('warehouse_id', $warehouseA->id)->where('product_id', $product->id)->sole();
        $b = WarehouseItem::query()->where('warehouse_id', $warehouseB->id)->where('product_id', $product->id)->sole();

        $this->assertSame('11.0000', $a->qty_on_hand);
        $this->assertSame('133.333333', $a->avg_cost);
        $this->assertSame('7.0000', $b->qty_on_hand);
        $this->assertSame(2, WarehouseItem::query()->where('product_id', $product->id)->count());
    }

    public function test_decrease_cannot_make_stock_negative_when_disabled(): void
    {
        InventoryConfiguration::query()->create(['negative_stock_allowed' => false]);
        $warehouse = Warehouse::factory()->create();
        $product = Product::query()->create(['name' => 'Product X', 'code' => 'PX']);
        $adjustment = $this->makeAdjustment($warehouse, $product, 'decrease', 1, 0);

        $this->expectException(ValidationException::class);

        app(WarehouseStockService::class)->postInventoryAdjustment($adjustment);
    }

    public function test_warehouse_transfer_moves_stock_once_when_posted(): void
    {
        InventoryConfiguration::query()->create(['negative_stock_allowed' => false]);
        $source = Warehouse::factory()->create();
        $destination = Warehouse::factory()->create();
        $product = Product::query()->create(['name' => 'Product X', 'code' => 'PX']);

        WarehouseItem::query()->create([
            'warehouse_id' => $source->id,
            'product_id' => $product->id,
            'qty_on_hand' => 10,
            'avg_cost' => 25,
            'total_value' => 250,
            'active' => true,
        ]);

        $transfer = WarehouseTransfer::query()->create([
            'transfer_no' => 'WT-' . str()->uuid(),
            'transfer_date' => '2026-05-14',
            'from_warehouse_id' => $source->id,
            'to_warehouse_id' => $destination->id,
            'status' => 'draft',
            'approved' => false,
        ]);
        $transfer->warehouseTransferLines()->create([
            'product_id' => $product->id,
            'qty' => 4,
        ]);

        app(WarehouseStockService::class)->postWarehouseTransfer($transfer);
        app(WarehouseStockService::class)->postWarehouseTransfer($transfer->fresh());

        $sourceItem = WarehouseItem::query()->where('warehouse_id', $source->id)->where('product_id', $product->id)->sole();
        $destinationItem = WarehouseItem::query()->where('warehouse_id', $destination->id)->where('product_id', $product->id)->sole();

        $this->assertSame('6.0000', $sourceItem->qty_on_hand);
        $this->assertSame('4.0000', $destinationItem->qty_on_hand);
        $this->assertSame('25.000000', $destinationItem->avg_cost);
    }

    public function test_zero_value_inventory_adjustment_approval_posts_stock_without_blank_journal_error(): void
    {
        InventoryConfiguration::query()->create(['negative_stock_allowed' => false]);
        DocumentNumbering::query()->create([
            'document_type' => 'inventory_adjustment',
            'prefix' => 'IA',
            'next_number' => 1,
            'type_of_account' => 'auto_numbering',
            'active' => true,
        ]);

        $warehouse = Warehouse::factory()->create();
        $product = Product::query()->create(['name' => 'Product X', 'code' => 'PX']);

        $adjustment = InventoryAdjustment::query()->create([
            'adjustment_no' => 'DRAFT-IA-TEST',
            'adjustment_date' => '2026-05-14',
            'warehouse_id' => $warehouse->id,
            'status' => 'draft',
            'approved' => false,
        ]);
        $adjustment->inventoryAdjustmentLines()->create([
            'product_id' => $product->id,
            'adjustment_type' => 'increase',
            'qty' => 3,
            'unit_cost' => 0,
        ]);

        app(TransactionApprovalService::class)->approve($adjustment);

        $item = WarehouseItem::query()->where('warehouse_id', $warehouse->id)->where('product_id', $product->id)->sole();

        $this->assertSame('3.0000', $item->qty_on_hand);
        $this->assertTrue((bool) $adjustment->fresh()->approved);
    }

    protected function postLine(Warehouse $warehouse, Product $product, string $type, float $qty, float $unitCost): void
    {
        app(WarehouseStockService::class)->postInventoryAdjustment(
            $this->makeAdjustment($warehouse, $product, $type, $qty, $unitCost)
        );
    }

    protected function makeAdjustment(Warehouse $warehouse, Product $product, string $type, float $qty, float $unitCost): InventoryAdjustment
    {
        $adjustment = InventoryAdjustment::query()->create([
            'adjustment_no' => 'IA-' . str()->uuid(),
            'adjustment_date' => '2026-05-14',
            'warehouse_id' => $warehouse->id,
            'status' => 'draft',
            'approved' => false,
        ]);
        $adjustment->inventoryAdjustmentLines()->create([
            'product_id' => $product->id,
            'adjustment_type' => $type,
            'qty' => $qty,
            'unit_cost' => $unitCost,
        ]);

        return $adjustment;
    }
}
