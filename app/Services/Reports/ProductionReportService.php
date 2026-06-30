<?php

namespace App\Services\Reports;

use App\Models\ProductionJournal;
use App\Models\ProductionOrder;
use App\Models\WarehouseItem;
use Illuminate\Support\Collection;

class ProductionReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'production-summary' => $this->productionSummary($reportKey, $filters, $meta),
            'production-variance' => $this->productionVariance($reportKey, $filters, $meta),
            'production-planning' => $this->productionPlanning($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported production report.'),
        };
    }

    private function productionSummary(string $reportKey, array $filters, array $meta): array
    {
        $query = ProductionJournal::query()->with(['finishedProduct', 'warehouse', 'byProducts']);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);
        $query->whereBetween('date', [$filters['date_from'], $filters['date_to']])
            ->where('status', '!=', 'cancelled');

        if (empty($filters['include_draft'])) {
            $query->where(fn ($builder) => $builder->where('stock_posted', true)->orWhere('status', 'posted'));
        }

        if (! empty($filters['product_id'])) {
            $query->where('finished_product_id', $filters['product_id']);
        }

        $rows = $query->orderBy('date')->orderBy('code')->get()->map(fn (ProductionJournal $journal) => [
            'production_order_no' => $journal->code,
            'date' => $journal->date?->format('Y-m-d'),
            'product' => $journal->finishedProduct?->name,
            'warehouse' => $journal->warehouse?->name,
            'planned_qty' => 0.0,
            'produced_qty' => round((float) $journal->output_quantity, 4),
            'rejected_qty' => 0.0,
            'raw_material_cost' => $this->toFloat($journal->raw_material_cost),
            'expense_cost' => $this->toFloat($journal->production_expense_amount),
            'byproduct_cost' => $this->toFloat($journal->by_product_allocated_cost),
            'total_cost' => $this->toFloat($journal->finished_goods_cost ?: $journal->total_cost_of_production),
            'cost_per_unit' => $this->toFloat($journal->cost_per_unit),
            'status' => $journal->status,
        ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Production Journal', 'key' => 'production_order_no'],
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Product', 'key' => 'product'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Produced Qty', 'key' => 'produced_qty'],
            ['title' => 'Raw Material Cost', 'key' => 'raw_material_cost'],
            ['title' => 'Expense Cost', 'key' => 'expense_cost'],
            ['title' => 'By-product Cost', 'key' => 'byproduct_cost'],
            ['title' => 'Total Cost', 'key' => 'total_cost'],
            ['title' => 'Cost Per Unit', 'key' => 'cost_per_unit'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows, [], [
            'produced_qty' => round(collect($rows)->sum('produced_qty'), 4),
            'total_cost' => $this->total($rows, 'total_cost'),
        ]);
    }

    private function productionVariance(string $reportKey, array $filters, array $meta): array
    {
        $orders = $this->plannedOrders($filters)->with(['finishedProduct', 'warehouse', 'rawMaterials'])->get();
        $journals = $this->actualJournals($filters)->with(['finishedProduct', 'warehouse', 'rawMaterials'])->get();

        $planned = $orders->groupBy(fn (ProductionOrder $order) => $this->groupKey($order))->map(
            fn (Collection $group) => [
                'product' => $group->first()->finishedProduct?->name,
                'warehouse' => $group->first()->warehouse?->name,
                'planned_orders' => $group->count(),
                'planned_output_qty' => round($group->sum(fn ($order) => (float) $order->output_quantity), 4),
                'planned_material_qty' => round($group->sum(fn ($order) => $order->rawMaterials->sum('quantity')), 4),
                'planned_cost' => $this->toFloat($group->sum('total_production_cost')),
            ],
        );

        $actual = $journals->groupBy(fn (ProductionJournal $journal) => $this->groupKey($journal))->map(
            fn (Collection $group) => [
                'product' => $group->first()->finishedProduct?->name,
                'warehouse' => $group->first()->warehouse?->name,
                'actual_runs' => $group->count(),
                'actual_output_qty' => round($group->sum(fn ($journal) => (float) $journal->output_quantity), 4),
                'actual_material_qty' => round($group->sum(fn ($journal) => $journal->rawMaterials->sum('quantity')), 4),
                'actual_cost' => $this->toFloat($group->sum('total_cost_of_production')),
            ],
        );

        $rows = collect(array_unique([...$planned->keys()->all(), ...$actual->keys()->all()]))
            ->map(function (string $key) use ($planned, $actual): array {
                $plan = $planned->get($key, []);
                $fact = $actual->get($key, []);
                $plannedCost = (float) ($plan['planned_cost'] ?? 0);
                $actualCost = (float) ($fact['actual_cost'] ?? 0);
                $plannedMaterial = (float) ($plan['planned_material_qty'] ?? 0);
                $actualMaterial = (float) ($fact['actual_material_qty'] ?? 0);
                $costVariance = round($actualCost - $plannedCost, 2);

                return [
                    'production_order' => ($plan['planned_orders'] ?? 0).' planned / '.($fact['actual_runs'] ?? 0).' actual',
                    'product' => $plan['product'] ?? $fact['product'] ?? 'Unknown product',
                    'warehouse' => $plan['warehouse'] ?? $fact['warehouse'] ?? null,
                    'planned_output_qty' => $plan['planned_output_qty'] ?? 0,
                    'actual_output_qty' => $fact['actual_output_qty'] ?? 0,
                    'planned_material_qty' => $plannedMaterial,
                    'actual_material_qty' => $actualMaterial,
                    'qty_variance' => round($actualMaterial - $plannedMaterial, 4),
                    'planned_cost' => $plannedCost,
                    'actual_cost' => $actualCost,
                    'cost_variance' => $costVariance,
                    'variance_percent' => $plannedCost != 0.0 ? round(($costVariance / $plannedCost) * 100, 2) : null,
                ];
            })->sortBy('product')->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Runs', 'key' => 'production_order'],
            ['title' => 'Product', 'key' => 'product'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Planned Output Qty', 'key' => 'planned_output_qty'],
            ['title' => 'Actual Output Qty', 'key' => 'actual_output_qty'],
            ['title' => 'Planned Material Qty', 'key' => 'planned_material_qty'],
            ['title' => 'Actual Material Qty', 'key' => 'actual_material_qty'],
            ['title' => 'Qty Variance', 'key' => 'qty_variance'],
            ['title' => 'Planned Cost', 'key' => 'planned_cost'],
            ['title' => 'Actual Cost', 'key' => 'actual_cost'],
            ['title' => 'Cost Variance', 'key' => 'cost_variance'],
            ['title' => 'Variance %', 'key' => 'variance_percent'],
        ], $rows, [], [
            'planned_cost' => $this->total($rows, 'planned_cost'),
            'actual_cost' => $this->total($rows, 'actual_cost'),
            'cost_variance' => $this->total($rows, 'cost_variance'),
        ], [
            'note' => 'Variance is aggregated by finished product, branch, and warehouse because production journals do not reference production orders directly.',
        ]);
    }

    private function productionPlanning(string $reportKey, array $filters, array $meta): array
    {
        $orders = ProductionOrder::query()
            ->with(['finishedProduct', 'warehouse', 'rawMaterials.product', 'rawMaterials.warehouse'])
            ->whereBetween('date', [$filters['date_from'], $filters['date_to']])
            ->where('void', false)
            ->whereNotIn('status', ['completed', 'void', 'cancelled']);
        $this->applyBranchFilter($orders, $filters);
        if (empty($filters['include_draft'])) {
            $orders->where('approved', true)->where('status', '!=', 'draft');
        }

        $orders = $orders->orderBy('date')->orderBy('code')->get();
        $stock = $this->stockLookup($orders, $filters);
        $rows = [];

        foreach ($orders as $order) {
            foreach ($order->rawMaterials as $material) {
                $warehouseId = (string) ($material->warehouse_id ?: $order->warehouse_id ?: 'all');
                $available = (float) ($stock[$material->product_id.'|'.$warehouseId] ?? 0);
                $required = (float) $material->quantity;
                $rows[] = [
                    'production_order' => $order->code,
                    'product' => $order->finishedProduct?->name,
                    'material' => $material->product?->name,
                    'warehouse' => $material->warehouse?->name ?: $order->warehouse?->name,
                    'planned_start' => $order->date?->format('Y-m-d'),
                    'planned_end' => $order->date?->format('Y-m-d'),
                    'required_qty' => round($required, 4),
                    'available_stock' => round($available, 4),
                    'shortage_qty' => round(max(0, $required - $available), 4),
                    'status' => $order->status,
                ];
            }
        }

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Production Order', 'key' => 'production_order'],
            ['title' => 'Finished Product', 'key' => 'product'],
            ['title' => 'Required Material', 'key' => 'material'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Planned Start', 'key' => 'planned_start'],
            ['title' => 'Required Qty', 'key' => 'required_qty'],
            ['title' => 'Available Stock', 'key' => 'available_stock'],
            ['title' => 'Shortage Qty', 'key' => 'shortage_qty'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows, [], [
            'required_qty' => round(collect($rows)->sum('required_qty'), 4),
            'shortage_qty' => round(collect($rows)->sum('shortage_qty'), 4),
        ]);
    }

    private function plannedOrders(array $filters)
    {
        $query = ProductionOrder::query()->whereBetween('date', [$filters['date_from'], $filters['date_to']]);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);
        $query->whereNotIn('status', ['void', 'cancelled']);

        return $query;
    }

    private function actualJournals(array $filters)
    {
        $query = ProductionJournal::query()->whereBetween('date', [$filters['date_from'], $filters['date_to']]);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);
        $query->where('status', '!=', 'cancelled');
        if (empty($filters['include_draft'])) {
            $query->where(fn ($builder) => $builder->where('stock_posted', true)->orWhere('status', 'posted'));
        }

        return $query;
    }

    private function groupKey(ProductionOrder|ProductionJournal $record): string
    {
        return implode('|', [
            (string) $record->finished_product_id,
            (string) ($record->branch_id ?: 'none'),
            (string) ($record->warehouse_id ?: 'none'),
        ]);
    }

    private function stockLookup(Collection $orders, array $filters): array
    {
        $productIds = $orders->flatMap(fn ($order) => $order->rawMaterials->pluck('product_id'))->filter()->unique();
        if ($productIds->isEmpty()) {
            return [];
        }

        return WarehouseItem::query()
            ->whereIn('product_id', $productIds)
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->get()
            ->groupBy(fn (WarehouseItem $item) => $item->product_id.'|'.($item->warehouse_id ?: 'all'))
            ->map(fn (Collection $items) => $items->sum('qty_on_hand'))
            ->all();
    }
}
