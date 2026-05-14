<?php

namespace App\Services;

use App\Models\TaxRate;
use App\Models\TaxSettings;

class TaxCalculationService
{
    /**
     * Calculate tax for a single transaction line.
     *
     * Context keys:
     *   transaction_type  – 'sales' | 'purchase'  (default: 'sales')
     *   tax_mode          – 'default' | 'exempt' | 'custom'  (default: 'default')
     *   custom_rate       – numeric rate % when tax_mode = 'custom'
     *   custom_tax_name   – label when tax_mode = 'custom'
     *   quantity          – numeric  (default: 1)
     *   discount          – absolute discount amount (default: 0)
     *   is_inclusive      – price includes tax  (default: false)
     */
    public function calculateForTransaction(
        float  $unitPrice,
        array  $context = [],
    ): array {
        $transactionType = $context['transaction_type'] ?? 'sales';
        $taxMode         = $context['tax_mode']         ?? 'default';
        $quantity        = (float) ($context['quantity'] ?? 1);
        $discount        = (float) ($context['discount'] ?? 0);
        $isInclusive     = (bool) ($context['is_inclusive'] ?? false);

        $subtotal     = $unitPrice * $quantity;
        $taxableAmount = max(0, $subtotal - $discount);

        // Exempt shortcut
        if ($taxMode === 'exempt') {
            return $this->buildResult($subtotal, $discount, $taxableAmount, 0, 0, []);
        }

        // Custom tax rate
        if ($taxMode === 'custom') {
            $customRate = (float) ($context['custom_rate'] ?? 0);
            $taxName    = $context['custom_tax_name'] ?? 'Tax';

            if ($isInclusive) {
                $taxableAmount = $this->extractExclusive($taxableAmount, $customRate);
            }

            $taxAmount = round($taxableAmount * $customRate / 100, 2);

            return $this->buildResult($subtotal, $discount, $taxableAmount, $customRate, $taxAmount, [
                ['name' => $taxName, 'rate' => $customRate, 'amount' => $taxAmount],
            ]);
        }

        // Default: look up company tax settings
        $settings = TaxSettings::first();

        if (! $settings) {
            return $this->buildResult($subtotal, $discount, $taxableAmount, 0, 0, []);
        }

        $taxEnabled = $transactionType === 'purchase'
            ? $settings->purchase_tax_enabled
            : $settings->sales_tax_enabled;

        if (! $taxEnabled) {
            return $this->buildResult($subtotal, $discount, $taxableAmount, 0, 0, []);
        }

        $taxRateId = $transactionType === 'purchase'
            ? $settings->default_purchase_tax_rate_id
            : $settings->default_sales_tax_rate_id;

        if (! $taxRateId) {
            // Fall back to stored rate percent
            $ratePercent = $transactionType === 'purchase'
                ? (float) $settings->purchase_tax_rate_percent
                : (float) $settings->sales_tax_rate_percent;

            $taxName = $transactionType === 'purchase'
                ? ($settings->purchase_tax_name ?? 'Tax')
                : ($settings->sales_tax_name ?? 'Tax');

            if ($isInclusive) {
                $taxableAmount = $this->extractExclusive($taxableAmount, $ratePercent);
            }

            $taxAmount = round($taxableAmount * $ratePercent / 100, 2);

            return $this->buildResult($subtotal, $discount, $taxableAmount, $ratePercent, $taxAmount, [
                ['name' => $taxName, 'rate' => $ratePercent, 'amount' => $taxAmount],
            ]);
        }

        $taxRate = TaxRate::with('taxRateComponents')->find($taxRateId);

        return $this->calculate($taxRate, $taxableAmount, ['is_inclusive' => $isInclusive], $subtotal, $discount);
    }

    /**
     * Low-level calculate from a TaxRate model (used by advanced tax logic).
     */
    public function calculate(?TaxRate $taxRate, float $taxableAmount, array $context = [], float $subtotal = 0, float $discount = 0): array
    {
        if (! $taxRate) {
            return $this->buildResult($subtotal ?: $taxableAmount, $discount, $taxableAmount, 0, 0, []);
        }

        $isInclusive = $context['is_inclusive'] ?? false;

        if ($isInclusive) {
            $taxableAmount = $this->extractExclusive($taxableAmount, $taxRate->rate_percent);
        }

        $taxAmount = round(($taxableAmount * $taxRate->rate_percent) / 100, 2);
        $breakup   = [];

        if ($taxRate->calculation_method === 'split') {
            $components = $taxRate->taxRateComponents;

            foreach ($components as $component) {
                $componentAmount = round(($taxableAmount * $component->rate_percent) / 100, 2);
                $breakup[]       = [
                    'name'   => $component->name ?? $component->component_name,
                    'rate'   => (float) $component->rate_percent,
                    'amount' => $componentAmount,
                ];
            }
        } else {
            $breakup[] = [
                'name'   => $taxRate->name ?? 'Tax',
                'rate'   => (float) $taxRate->rate_percent,
                'amount' => $taxAmount,
            ];
        }

        return $this->buildResult(
            $subtotal ?: $taxableAmount,
            $discount,
            $taxableAmount,
            (float) $taxRate->rate_percent,
            $taxAmount,
            $breakup,
        );
    }

    private function buildResult(
        float $subtotal,
        float $discount,
        float $taxableAmount,
        float $taxRate,
        float $taxAmount,
        array $breakup,
    ): array {
        return [
            'subtotal'       => round($subtotal, 2),
            'discount'       => round($discount, 2),
            'taxable_amount' => round($taxableAmount, 2),
            'tax_rate'       => $taxRate,
            'tax_amount'     => round($taxAmount, 2),
            'total_amount'   => round($taxableAmount + $taxAmount, 2),
            'tax_breakup'    => $breakup,
        ];
    }

    private function extractExclusive(float $inclusiveAmount, float $taxPercent): float
    {
        if ($taxPercent <= 0) {
            return $inclusiveAmount;
        }

        return $inclusiveAmount / (1 + ($taxPercent / 100));
    }
}
