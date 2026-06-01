<?php

namespace App\Services\BusinessRules;

use App\Models\InvoiceLine;
use App\Models\Product;

class SuggestedSellingPriceResolver
{
    public function suggest(?Product $product, ?string $contactId, string $mode): array
    {
        if (!$product) {
            return [
                'suggested_price' => null,
                'source' => 'not_applicable',
                'standard_price' => null,
                'last_sale_price' => null,
                'recent_price' => null,
                'average_cost' => null,
                'markup_price' => null,
            ];
        }

        $standard = (float) ($product->selling_price ?? 0);
        $recent = $this->recentPrice($product->id);
        $lastSale = $contactId ? $this->lastSalePrice($product->id, $contactId) : null;
        $averageCost = (float) ($product->warehouseItems()->avg('avg_cost') ?: $product->purchase_price ?: 0);
        $markupPrice = $averageCost > 0 ? round($averageCost * 1.10, 2) : null;

        $suggested = match ($mode) {
            'last_sale' => $lastSale ?? $recent ?? $standard,
            'standard_price' => $standard,
            'average_cost_markup' => $markupPrice ?? $standard,
            default => $recent ?? $standard,
        };

        return [
            'suggested_price' => $suggested,
            'source' => $mode,
            'standard_price' => $standard,
            'last_sale_price' => $lastSale,
            'recent_price' => $recent,
            'average_cost' => $averageCost,
            'markup_price' => $markupPrice,
        ];
    }

    private function recentPrice(string $productId): ?float
    {
        $line = InvoiceLine::query()
            ->where('product_id', $productId)
            ->latest()
            ->first();

        return $line ? (float) $line->unit_price : null;
    }

    private function lastSalePrice(string $productId, string $contactId): ?float
    {
        $line = InvoiceLine::query()
            ->where('product_id', $productId)
            ->whereHas('invoice', fn ($query) => $query->where('contact_id', $contactId))
            ->latest()
            ->first();

        return $line ? (float) $line->unit_price : null;
    }
}
