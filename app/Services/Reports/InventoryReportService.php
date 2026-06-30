<?php

namespace App\Services\Reports;

use App\Models\InventoryLedger;
use App\Models\InvoiceLine;
use App\Models\Product;
use App\Models\WarehouseItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InventoryReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'inventory-position' => $this->inventoryPosition($reportKey, $filters, $meta),
            'warehouse-wise-stock' => $this->warehouseWiseStock($reportKey, $filters, $meta),
            'inventory-ageing' => $this->inventoryAgeing($reportKey, $filters, $meta),
            'inventory-movement' => $this->inventoryMovement($reportKey, $filters, $meta),
            'inventory-ledger' => $this->inventoryLedger($reportKey, $filters, $meta),
            'product-profitability' => $this->productProfitability($reportKey, $filters, $meta),
            'inventory-master' => $this->inventoryMaster($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported inventory report.'),
        };
    }

    protected function inventoryPosition(string $reportKey, array $filters, array $meta): array
    {
        $rows = WarehouseItem::query()
            ->with(['warehouse', 'product.productCategory', 'product.productUnit'])
            ->when(! $filters['include_inactive'], fn ($query) => $query->where('active', true))
            ->when(! empty($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']))
            ->when(! empty($filters['warehouse_id']), fn ($query) => $query->where('warehouse_id', $filters['warehouse_id']))
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->get()
            ->map(function (WarehouseItem $item) {
                $product = $item->product;

                return [
                    'product_code' => $product?->code,
                    'product_name' => $product?->name,
                    'category' => $product?->productCategory?->name,
                    'warehouse' => $item->warehouse?->name,
                    'unit' => $product?->productUnit?->name,
                    'qty_on_hand' => round((float) $item->qty_on_hand, 4),
                    'avg_cost' => round((float) $item->avg_cost, 2),
                    'stock_value' => round((float) $item->total_value, 2),
                    'reorder_level' => $this->toFloat($item->reorder_level ?? $product?->reorder_level),
                    'status' => $item->active ? 'Active' : 'Inactive',
                ];
            })->filter(fn ($row) => $filters['include_zero_stock'] || abs($row['qty_on_hand']) > 0.0001)
            ->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Product Code', 'key' => 'product_code'],
            ['title' => 'Product Name', 'key' => 'product_name'],
            ['title' => 'Category', 'key' => 'category'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Unit', 'key' => 'unit'],
            ['title' => 'Qty On Hand', 'key' => 'qty_on_hand'],
            ['title' => 'Avg Cost', 'key' => 'avg_cost'],
            ['title' => 'Stock Value', 'key' => 'stock_value'],
            ['title' => 'Reorder Level', 'key' => 'reorder_level'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }

    protected function warehouseWiseStock(string $reportKey, array $filters, array $meta): array
    {
        $rows = WarehouseItem::query()
            ->with(['branch', 'warehouse', 'product.productCategory', 'product.productUnit'])
            ->when(! $filters['include_inactive'], fn ($query) => $query->where('active', true))
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->when(! empty($filters['warehouse_id']), fn ($query) => $query->where('warehouse_id', $filters['warehouse_id']))
            ->when(! empty($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']))
            ->when(! empty($filters['category_id']), fn ($query) => $query->whereHas('product', fn ($product) => $product->where('product_category_id', $filters['category_id'])))
            ->get()
            ->map(function (WarehouseItem $item) {
                $product = $item->product;
                $qty = (float) $item->qty_on_hand;
                $reorder = (float) ($item->reorder_level ?? $product?->reorder_level ?? 0);

                return [
                    'warehouse' => $item->warehouse?->name,
                    'product_code' => $product?->code,
                    'product_name' => $product?->name,
                    'sku' => $product?->sku,
                    'category' => $product?->productCategory?->name,
                    'unit' => $product?->productUnit?->name,
                    'qty_on_hand' => round($qty, 4),
                    'avg_cost' => round((float) $item->avg_cost, 2),
                    'stock_value' => round((float) $item->total_value, 2),
                    'reorder_level' => round($reorder, 4),
                    'status' => $qty <= 0 ? 'Out of Stock' : ($reorder > 0 && $qty <= $reorder ? 'Low Stock' : 'In Stock'),
                ];
            })
            ->filter(fn ($row) => $filters['include_zero_stock'] || abs($row['qty_on_hand']) > 0.0001)
            ->values()
            ->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Product Code', 'key' => 'product_code'],
            ['title' => 'Product Name', 'key' => 'product_name'],
            ['title' => 'SKU', 'key' => 'sku'],
            ['title' => 'Category', 'key' => 'category'],
            ['title' => 'Unit', 'key' => 'unit'],
            ['title' => 'Qty On Hand', 'key' => 'qty_on_hand'],
            ['title' => 'Avg Cost', 'key' => 'avg_cost'],
            ['title' => 'Stock Value', 'key' => 'stock_value'],
            ['title' => 'Reorder Level', 'key' => 'reorder_level'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }

    protected function inventoryAgeing(string $reportKey, array $filters, array $meta): array
    {
        $asOf = Carbon::parse($filters['as_of_date']);
        $ledger = $this->ledgerQuery($filters)
            ->whereDate('transaction_date', '<=', $asOf->toDateString())
            ->get()
            ->groupBy(fn (InventoryLedger $row) => $row->product_id.'|'.($row->warehouse_id ?: 'none'));

        $rows = $ledger->map(function (Collection $entries) use ($asOf) {
            $first = $entries->first();
            $lastInbound = $entries->where('qty_in', '>', 0)->sortByDesc('transaction_date')->first();
            $age = $lastInbound ? Carbon::parse($lastInbound->transaction_date)->diffInDays($asOf) : 0;
            $bucket = match (true) {
                $age <= 30 => '0-30',
                $age <= 60 => '31-60',
                $age <= 90 => '61-90',
                $age <= 180 => '91-180',
                default => '180+',
            };
            $qty = $entries->sum(fn ($entry) => (float) $entry->qty_in - (float) $entry->qty_out);
            $value = $entries->sum(fn ($entry) => (float) $entry->value_in - (float) $entry->value_out);

            return [
                'product' => $first->product?->name,
                'warehouse' => $first->warehouse?->name,
                'qty' => round($qty, 4),
                'stock_value' => round($value, 2),
                'age_bucket' => $bucket,
            ];
        })->filter(fn ($row) => $filters['include_zero_stock'] || abs($row['qty']) > 0.0001)->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Product', 'key' => 'product'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Qty', 'key' => 'qty'],
            ['title' => 'Stock Value', 'key' => 'stock_value'],
            ['title' => 'Age Bucket', 'key' => 'age_bucket'],
        ], $rows);
    }

    protected function inventoryMovement(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->movementRows($filters)->sortBy('date')->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Product', 'key' => 'product'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Source Type', 'key' => 'source_type'],
            ['title' => 'Source No', 'key' => 'source_no'],
            ['title' => 'In Qty', 'key' => 'in_qty'],
            ['title' => 'Out Qty', 'key' => 'out_qty'],
            ['title' => 'Balance Qty', 'key' => 'balance_qty'],
            ['title' => 'Unit Cost', 'key' => 'unit_cost'],
            ['title' => 'Value', 'key' => 'value'],
        ], $rows);
    }

    protected function inventoryLedger(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->movementRows($filters)
            ->sortBy('date')
            ->values()
            ->all();
        foreach ($rows as &$row) {
            $row['balance'] = $row['balance_qty'];
        }

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Source', 'key' => 'source_type'],
            ['title' => 'Reference', 'key' => 'source_no'],
            ['title' => 'In', 'key' => 'in_qty'],
            ['title' => 'Out', 'key' => 'out_qty'],
            ['title' => 'Balance', 'key' => 'balance'],
            ['title' => 'Unit Cost', 'key' => 'unit_cost'],
            ['title' => 'Value', 'key' => 'value'],
        ], $rows);
    }

    protected function productProfitability(string $reportKey, array $filters, array $meta): array
    {
        $products = Product::query()
            ->when(! empty($filters['product_id']), fn ($query) => $query->whereKey($filters['product_id']))
            ->get();
        $rows = $products->map(function ($product) use ($filters) {
            $lines = InvoiceLine::query()->where('product_id', $product->id)
                ->whereHas('invoice', function ($query) use ($filters) {
                    $query->whereBetween('invoice_date', [$filters['date_from'], $filters['date_to']]);
                    $this->applyBranchFilter($query, $filters);
                    $this->applyStatusApprovalFilters($query, $filters);
                });
            $qtySold = (clone $lines)->sum('qty');
            $salesAmount = (clone $lines)->sum('line_total');
            $costAmount = round($qtySold * $this->averageCostForProduct($product->id, $filters), 2);
            $grossProfit = round($salesAmount - $costAmount, 2);

            return [
                'product' => $product->name,
                'qty_sold' => round($qtySold, 4),
                'sales_amount' => round($salesAmount, 2),
                'cost_amount' => $costAmount,
                'gross_profit' => $grossProfit,
                'gross_margin_percent' => $salesAmount ? round(($grossProfit / $salesAmount) * 100, 2) : 0,
            ];
        })->filter(fn ($row) => abs($row['qty_sold']) > 0.0001)->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Product', 'key' => 'product'],
            ['title' => 'Qty Sold', 'key' => 'qty_sold'],
            ['title' => 'Sales Amount', 'key' => 'sales_amount'],
            ['title' => 'Cost Amount', 'key' => 'cost_amount'],
            ['title' => 'Gross Profit', 'key' => 'gross_profit'],
            ['title' => 'Gross Margin %', 'key' => 'gross_margin_percent'],
        ], $rows);
    }

    protected function inventoryMaster(string $reportKey, array $filters, array $meta): array
    {
        $rows = Product::query()->with(['productCategory', 'productUnit'])
            ->when(! $filters['include_inactive'], fn ($query) => $query->where('active', true))
            ->when(! empty($filters['category_id']), fn ($query) => $query->where('product_category_id', $filters['category_id']))
            ->get()->map(fn ($product) => [
                'product_code' => $product->code,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'product_name' => $product->name,
                'category' => $product->productCategory?->name,
                'unit' => $product->productUnit?->name,
                'selling_price' => $this->toFloat($product->selling_price),
                'purchase_price' => $this->toFloat($product->purchase_price),
                'track_inventory' => $product->track_inventory ? 'Yes' : 'No',
                'allow_sale' => $product->allow_sale ? 'Yes' : 'No',
                'allow_purchase' => $product->allow_purchase ? 'Yes' : 'No',
                'reorder_level' => $this->toFloat($product->reorder_level),
                'status' => $product->active ? 'Active' : 'Inactive',
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Product Code', 'key' => 'product_code'],
            ['title' => 'SKU', 'key' => 'sku'],
            ['title' => 'Barcode', 'key' => 'barcode'],
            ['title' => 'Product Name', 'key' => 'product_name'],
            ['title' => 'Category', 'key' => 'category'],
            ['title' => 'Unit', 'key' => 'unit'],
            ['title' => 'Selling Price', 'key' => 'selling_price'],
            ['title' => 'Purchase Price', 'key' => 'purchase_price'],
            ['title' => 'Track Inventory', 'key' => 'track_inventory'],
            ['title' => 'Allow Sale', 'key' => 'allow_sale'],
            ['title' => 'Allow Purchase', 'key' => 'allow_purchase'],
            ['title' => 'Reorder Level', 'key' => 'reorder_level'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }

    protected function movementRows(array $filters): Collection
    {
        return $this->ledgerQuery($filters)
            ->whereBetween('transaction_date', [$filters['date_from'], $filters['date_to']])
            ->get()
            ->map(fn (InventoryLedger $line) => $this->movementRow(
                $line->transaction_date ?? $line->created_at,
                $line->product_id,
                $line->product?->name,
                $line->source_type,
                $line->source_no,
                (float) $line->qty_in,
                (float) $line->qty_out,
                (float) $line->unit_cost,
                $line->warehouse?->name,
                $line->warehouse_id,
                (float) $line->balance_qty,
            ));
    }

    protected function movementRow($date, ?string $productId, ?string $productName, string $sourceType, ?string $sourceNo, float $inQty, float $outQty, float $unitCost, ?string $warehouse = null, ?string $warehouseId = null, float $balanceQty = 0): array
    {
        return [
            'date' => $date ? Carbon::parse($date)->format('Y-m-d') : null,
            'product_id' => $productId,
            'product' => $productName,
            'warehouse' => $warehouse,
            'warehouse_id' => $warehouseId,
            'source_type' => $sourceType,
            'source_no' => $sourceNo,
            'in_qty' => round((float) $inQty, 4),
            'out_qty' => round((float) $outQty, 4),
            'balance_qty' => round($balanceQty, 4),
            'unit_cost' => round((float) $unitCost, 2),
            'value' => round(((float) $inQty - (float) $outQty) * (float) $unitCost, 2),
        ];
    }

    protected function movementBalanceForProduct(string $productId): float
    {
        return round((float) WarehouseItem::query()->where('product_id', $productId)->sum('qty_on_hand'), 4);
    }

    protected function averageCostForProduct(string $productId, array $filters = []): float
    {
        $query = WarehouseItem::query()->where('product_id', $productId)
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($builder) => $builder->where('branch_id', $filters['branch_id']))
            ->when(! empty($filters['warehouse_id']), fn ($builder) => $builder->where('warehouse_id', $filters['warehouse_id']));
        $qty = (float) (clone $query)->sum('qty_on_hand');
        $value = (float) (clone $query)->sum('total_value');

        return $qty > 0 ? round($value / $qty, 2) : 0;
    }

    private function ledgerQuery(array $filters)
    {
        return InventoryLedger::query()->with(['product', 'warehouse'])
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->when(! empty($filters['warehouse_id']), fn ($query) => $query->where('warehouse_id', $filters['warehouse_id']))
            ->when(! empty($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']));
    }
}
