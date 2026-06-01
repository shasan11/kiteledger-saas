<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryQueryTool extends BaseQueryTool
{
    public function lowStock(Request $request): array
    {
        return $this->stockComparison($request, 'inventory.low_stock', 'Low stock products', '<=');
    }

    public function negativeStock(Request $request): array
    {
        return $this->stockComparison($request, 'inventory.negative_stock', 'Negative stock products', '<', 0);
    }

    public function inventoryValue(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['warehouse_items', 'products'])) {
            return $this->empty('inventory.value', 'Inventory value', $request);
        }

        $query = DB::table('warehouse_items')
            ->join('products', 'products.id', '=', 'warehouse_items.product_id')
            ->select([
                'products.id',
                'products.name',
                'products.code',
                DB::raw('SUM(warehouse_items.qty_on_hand) as qty_on_hand'),
                DB::raw('SUM(warehouse_items.total_value) as total_value'),
            ])
            ->groupBy('products.id', 'products.name', 'products.code');

        $this->applyActive($query, 'warehouse_items');
        $this->applyBranch($query, $request, 'warehouse_items');

        $records = $query->orderByDesc('total_value')->limit(25)->get()->map(fn ($row) => [
            'product_id' => (string) $row->id,
            'name' => $row->name,
            'code' => $row->code,
            'qty_on_hand' => (float) $row->qty_on_hand,
            'total_value' => $this->number($row->total_value),
            'open_url' => '/inventory/products/' . $row->id,
        ])->all();

        $total = array_sum(array_column($records, 'total_value'));
        return AiToolResult::query('inventory.value', 'Inventory value', $records, $this->contextFilters($request), 'Inventory value in the listed records totals ' . number_format($total, 2) . '.', '/reports/inventory/inventory-position')->toArray();
    }

    public function deadStock(Request $request): array
    {
        return $this->empty('inventory.dead_stock', 'Dead stock', $request, [], 'Dead stock analysis needs movement history; no deterministic movement rule is configured yet.');
    }

    public function fastMovingProducts(Request $request): array
    {
        return app(SalesQueryTool::class)->salesByProduct($request);
    }

    public function warehouseWiseStock(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['warehouse_items', 'products', 'warehouses'])) {
            return $this->empty('inventory.warehouse_wise_stock', 'Warehouse-wise stock', $request);
        }

        $query = DB::table('warehouse_items')
            ->join('products', 'products.id', '=', 'warehouse_items.product_id')
            ->join('warehouses', 'warehouses.id', '=', 'warehouse_items.warehouse_id')
            ->select(['warehouse_items.id', 'products.name as product_name', 'warehouses.name as warehouse_name', 'warehouse_items.qty_on_hand', 'warehouse_items.total_value']);

        $this->applyActive($query, 'warehouse_items');
        $this->applyBranch($query, $request, 'warehouse_items');

        $records = $query->orderBy('warehouses.name')->limit(50)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'product_name' => $row->product_name,
            'warehouse_name' => $row->warehouse_name,
            'qty_on_hand' => (float) $row->qty_on_hand,
            'total_value' => $this->number($row->total_value),
        ])->all();

        return AiToolResult::query('inventory.warehouse_wise_stock', 'Warehouse-wise stock', $records, $this->contextFilters($request), count($records) ? 'Warehouse-wise stock was read from inventory tables.' : 'No warehouse stock was found.', '/reports/inventory/warehouse-wise-stock')->toArray();
    }

    public function productsWithoutCost(Request $request): array
    {
        return app(ProductQueryTool::class)->productsWithoutCost($request);
    }

    public function stockAdjustmentRisks(Request $request): array
    {
        return $this->empty('inventory.stock_adjustment_risks', 'Stock adjustment risks', $request, [], 'No deterministic stock adjustment risk rule is configured yet.');
    }

    private function stockComparison(Request $request, string $tool, string $title, string $operator, ?float $fixed = null): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['warehouse_items', 'products'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('warehouse_items')
            ->join('products', 'products.id', '=', 'warehouse_items.product_id')
            ->select(['products.id', 'products.name', 'products.code', 'warehouse_items.qty_on_hand', 'warehouse_items.reorder_level', 'warehouse_items.warehouse_id']);

        if ($fixed !== null) {
            $query->where('warehouse_items.qty_on_hand', $operator, $fixed);
        } else {
            $query->whereColumn('warehouse_items.qty_on_hand', $operator, 'warehouse_items.reorder_level');
        }

        $this->applyActive($query, 'warehouse_items');
        $this->applyBranch($query, $request, 'warehouse_items');

        $records = $query->limit(25)->get()->map(fn ($row) => [
            'product_id' => (string) $row->id,
            'name' => $row->name,
            'code' => $row->code,
            'warehouse_id' => (string) $row->warehouse_id,
            'qty_on_hand' => (float) $row->qty_on_hand,
            'reorder_level' => (float) ($row->reorder_level ?? 0),
            'open_url' => '/inventory/products/' . $row->id,
        ])->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $title . ' returned ' . count($records) . ' products.' : 'No products matched this stock check.', '/inventory/products')->toArray();
    }
}
