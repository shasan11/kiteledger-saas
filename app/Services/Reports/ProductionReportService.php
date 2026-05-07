<?php

namespace App\Services\Reports;

class ProductionReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        $columns = match ($reportKey) {
            'production-summary' => [
                ['title' => 'Production Order No', 'key' => 'production_order_no'],
                ['title' => 'Product', 'key' => 'product'],
                ['title' => 'Planned Qty', 'key' => 'planned_qty'],
                ['title' => 'Produced Qty', 'key' => 'produced_qty'],
                ['title' => 'Rejected Qty', 'key' => 'rejected_qty'],
                ['title' => 'Total Cost', 'key' => 'total_cost'],
                ['title' => 'Cost Per Unit', 'key' => 'cost_per_unit'],
                ['title' => 'Status', 'key' => 'status'],
            ],
            'production-variance' => [
                ['title' => 'Production Order', 'key' => 'production_order'],
                ['title' => 'Product', 'key' => 'product'],
                ['title' => 'Planned Material Qty', 'key' => 'planned_material_qty'],
                ['title' => 'Actual Material Qty', 'key' => 'actual_material_qty'],
                ['title' => 'Qty Variance', 'key' => 'qty_variance'],
                ['title' => 'Planned Cost', 'key' => 'planned_cost'],
                ['title' => 'Actual Cost', 'key' => 'actual_cost'],
                ['title' => 'Cost Variance', 'key' => 'cost_variance'],
                ['title' => 'Variance %', 'key' => 'variance_percent'],
            ],
            'production-planning' => [
                ['title' => 'Production Order', 'key' => 'production_order'],
                ['title' => 'Product', 'key' => 'product'],
                ['title' => 'Planned Start', 'key' => 'planned_start'],
                ['title' => 'Planned End', 'key' => 'planned_end'],
                ['title' => 'Required Qty', 'key' => 'required_qty'],
                ['title' => 'Available Stock', 'key' => 'available_stock'],
                ['title' => 'Shortage Qty', 'key' => 'shortage_qty'],
                ['title' => 'Status', 'key' => 'status'],
            ],
            default => throw new \InvalidArgumentException('Unsupported production report.'),
        };

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, $columns, [], [], [
            'note' => 'Production/BOM tables are not present in the current schema, so this report is schema-aware and currently returns no rows.',
        ]);
    }
}
