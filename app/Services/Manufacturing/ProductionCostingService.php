<?php

namespace App\Services\Manufacturing;

use App\Models\ProductionOrder;
use Illuminate\Validation\ValidationException;

class ProductionCostingService
{
    public function calculate(ProductionOrder $order): array
    {
        $order->loadMissing(['rawMaterials', 'expenses', 'byproducts']);

        $rawMaterialCost = $order->rawMaterials->sum(fn ($line) => (float) ($line->total_cost ?: ((float) $line->quantity * (float) $line->unit_cost)));
        $expenseCost = $order->expenses->sum(fn ($line) => (float) $line->amount);
        $totalProductionCost = $rawMaterialCost + $expenseCost;
        $sharePercent = $order->byproducts->sum(fn ($line) => (float) $line->cost_share_percent);

        if ($sharePercent > 100.0001) {
            throw ValidationException::withMessages([
                'byproducts' => ['By-product cost share total cannot exceed 100%.'],
            ]);
        }

        $byproductCost = $order->byproducts->sum(
            fn ($line) => $totalProductionCost * ((float) $line->cost_share_percent / 100)
        );
        $finishedGoodsCost = max($totalProductionCost - $byproductCost, 0);
        $outputQuantity = (float) $order->output_quantity;

        if ($outputQuantity <= 0) {
            throw ValidationException::withMessages([
                'output_quantity' => ['Output quantity must be greater than zero.'],
            ]);
        }

        return [
            'total_raw_material_cost' => round($rawMaterialCost, 6),
            'total_expense_cost' => round($expenseCost, 6),
            'total_byproduct_cost' => round($byproductCost, 6),
            'total_finished_goods_cost' => round($finishedGoodsCost, 6),
            'total_production_cost' => round($totalProductionCost, 6),
            'finished_goods_unit_cost' => round($finishedGoodsCost / $outputQuantity, 6),
        ];
    }

    public function syncLineCosts(ProductionOrder $order): ProductionOrder
    {
        $totals = $this->calculate($order);
        $totalProductionCost = (float) $totals['total_production_cost'];

        foreach ($order->rawMaterials as $line) {
            $line->forceFill([
                'total_cost' => round((float) $line->quantity * (float) $line->unit_cost, 6),
            ])->saveQuietly();
        }

        foreach ($order->byproducts as $line) {
            $allocated = round($totalProductionCost * ((float) $line->cost_share_percent / 100), 6);
            $qty = (float) $line->quantity;

            $line->forceFill([
                'allocated_cost' => $allocated,
                'unit_cost' => $qty > 0 ? round($allocated / $qty, 6) : 0,
            ])->saveQuietly();
        }

        $order->forceFill($totals)->saveQuietly();

        return $order->refresh();
    }
}
