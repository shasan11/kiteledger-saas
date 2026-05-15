<?php

namespace App\Services\Reports;

use App\Models\DebitNoteLine;
use App\Models\InventoryAdjustmentLine;
use App\Models\InvoiceLine;
use App\Models\Product;
use App\Models\PurchaseBillLine;
use App\Models\SalesReturnLine;
use App\Models\WarehouseItem;
use App\Models\WarehouseTransferLine;
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
            ->when(!$filters['include_inactive'], fn ($query) => $query->where('active', true))
            ->when(!empty($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']))
            ->when(!empty($filters['warehouse_id']), fn ($query) => $query->where('warehouse_id', $filters['warehouse_id']))
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
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
            ->when(!$filters['include_inactive'], fn ($query) => $query->where('active', true))
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->when(!empty($filters['warehouse_id']), fn ($query) => $query->where('warehouse_id', $filters['warehouse_id']))
            ->when(!empty($filters['product_id']), fn ($query) => $query->where('product_id', $filters['product_id']))
            ->when(!empty($filters['category_id']), fn ($query) => $query->whereHas('product', fn ($product) => $product->where('product_category_id', $filters['category_id'])))
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
        $rows = Product::query()->with('productCategory')->get()->map(function ($product) {
            $lastPurchase = PurchaseBillLine::query()->where('product_id', $product->id)->latest('created_at')->first();
            $age = $lastPurchase ? Carbon::parse($lastPurchase->created_at)->diffInDays(now()) : 0;
            $bucket = match (true) {
                $age <= 30 => '0-30',
                $age <= 60 => '31-60',
                $age <= 90 => '61-90',
                $age <= 180 => '91-180',
                default => '180+',
            };
            $qty = $this->movementBalanceForProduct($product->id);
            $cost = $this->averageCostForProduct($product->id);
            return [
                'product' => $product->name,
                'warehouse' => null,
                'qty' => round($qty, 4),
                'stock_value' => round($qty * $cost, 2),
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
        $rows = $this->movementRows()->sortBy('date')->values()->all();
        $balance = 0;
        foreach ($rows as &$row) {
            $balance += $row['in_qty'] - $row['out_qty'];
            $row['balance_qty'] = round($balance, 4);
        }

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
        $rows = $this->movementRows()
            ->filter(fn ($row) => empty($filters['product_id']) || $row['product_id'] === $filters['product_id'])
            ->filter(fn ($row) => empty($filters['warehouse_id']) || ($row['warehouse_id'] ?? null) === $filters['warehouse_id'])
            ->sortBy('date')
            ->values()
            ->all();
        $balance = 0;
        foreach ($rows as &$row) {
            $balance += $row['in_qty'] - $row['out_qty'];
            $row['balance'] = round($balance, 4);
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
        $rows = Product::query()->get()->map(function ($product) {
            $qtySold = InvoiceLine::query()->where('product_id', $product->id)->sum('qty');
            $salesAmount = InvoiceLine::query()->where('product_id', $product->id)->sum('line_total');
            $costAmount = round($qtySold * $this->averageCostForProduct($product->id), 2);
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
        $rows = Product::query()->with(['productCategory', 'productUnit'])->get()->map(fn ($product) => [
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

    protected function movementRows(): Collection
    {
        $rows = collect();

        foreach (PurchaseBillLine::query()->with(['product', 'purchaseBill'])->get() as $line) {
            $rows->push($this->movementRow($line->purchaseBill?->bill_date, $line->product_id, $line->product?->name, 'Purchase Bill', $line->purchaseBill?->bill_no, $line->qty, 0, $line->unit_price));
        }
        foreach (InvoiceLine::query()->with(['product', 'invoice'])->get() as $line) {
            $rows->push($this->movementRow($line->invoice?->invoice_date, $line->product_id, $line->product?->name, 'Invoice', $line->invoice?->invoice_no, 0, $line->qty, $line->unit_price));
        }
        foreach (SalesReturnLine::query()->with(['product', 'salesReturn'])->get() as $line) {
            $rows->push($this->movementRow($line->salesReturn?->sales_return_date, $line->product_id, $line->product?->name, 'Sales Return', $line->salesReturn?->sales_return_no, $line->qty, 0, $line->unit_price));
        }
        foreach (DebitNoteLine::query()->with(['product', 'debitNote'])->get() as $line) {
            $rows->push($this->movementRow($line->debitNote?->debit_note_date, $line->product_id, $line->product?->name, 'Debit Note', $line->debitNote?->debit_note_no, 0, $line->qty, $line->unit_price));
        }
        foreach (InventoryAdjustmentLine::query()->with(['product', 'inventoryAdjustment.warehouse'])->whereHas('inventoryAdjustment', fn ($query) => $query->where('stock_posted', true))->get() as $line) {
            $qty = (float) $line->qty;
            $rows->push($this->movementRow(
                $line->inventoryAdjustment?->adjustment_date ?? $line->created_at,
                $line->product_id,
                $line->product?->name,
                'Inventory Adjustment',
                $line->inventoryAdjustment?->adjustment_no,
                $line->adjustment_type === 'increase' ? $qty : 0,
                $line->adjustment_type === 'decrease' ? $qty : 0,
                $line->unit_cost ?? 0,
                $line->inventoryAdjustment?->warehouse?->name,
                $line->inventoryAdjustment?->warehouse_id
            ));
        }
        foreach (WarehouseTransferLine::query()->with(['product', 'warehouseTransfer'])->get() as $line) {
            $rows->push($this->movementRow($line->warehouseTransfer?->transfer_date ?? $line->created_at, $line->product_id, $line->product?->name, 'Warehouse Transfer', $line->warehouseTransfer?->transfer_no, 0, $line->qty, $line->unit_cost ?? 0));
        }

        return $rows;
    }

    protected function movementRow($date, ?string $productId, ?string $productName, string $sourceType, ?string $sourceNo, float $inQty, float $outQty, float $unitCost, ?string $warehouse = null, ?string $warehouseId = null): array
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
            'unit_cost' => round((float) $unitCost, 2),
            'value' => round(((float) $inQty - (float) $outQty) * (float) $unitCost, 2),
        ];
    }

    protected function movementBalanceForProduct(string $productId): float
    {
        return round((float) WarehouseItem::query()->where('product_id', $productId)->sum('qty_on_hand'), 4);
    }

    protected function averageCostForProduct(string $productId): float
    {
        $qty = (float) WarehouseItem::query()->where('product_id', $productId)->sum('qty_on_hand');
        $value = (float) WarehouseItem::query()->where('product_id', $productId)->sum('total_value');
        return $qty > 0 ? round($value / $qty, 2) : 0;
    }
}
