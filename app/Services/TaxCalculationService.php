<?php

namespace App\Services;

use App\Models\TaxRate;
use App\Models\TaxRateComponent;

class TaxCalculationService
{
    public function calculate(?TaxRate $taxRate, float $taxableAmount, array $context = []): array
    {
        if (!$taxRate) {
            return [
                'tax_amount' => 0,
                'tax_breakup' => [],
            ];
        }

        $isInclusive = $context['is_inclusive'] ?? false;

        if ($isInclusive) {
            $taxableAmount = $this->calculateBackward($taxableAmount, $taxRate->rate_percent);
        }

        $taxAmount = ($taxableAmount * $taxRate->rate_percent) / 100;

        $breakup = [];

        if ($taxRate->calculation_method === 'split') {
            $components = $taxRate->taxRateComponents;

            foreach ($components as $component) {
                $componentAmount = ($taxableAmount * $component->rate_percent) / 100;
                $breakup[] = [
                    'name' => $component->name,
                    'rate' => $component->rate_percent,
                    'amount' => round($componentAmount, 2),
                ];
            }
        } else {
            $breakup[] = [
                'name' => $taxRate->name ?? 'Tax',
                'rate' => $taxRate->rate_percent,
                'amount' => round($taxAmount, 2),
            ];
        }

        return [
            'tax_amount' => round($taxAmount, 2),
            'tax_breakup' => $breakup,
        ];
    }

    protected function calculateBackward(float $amount, float $taxPercent): float
    {
        return $amount / (1 + ($taxPercent / 100));
    }
}
