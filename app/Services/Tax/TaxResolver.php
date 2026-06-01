<?php

namespace App\Services\Tax;

use App\Models\TaxRate;
use App\Models\TaxRule;
use App\Models\TaxSettings;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class TaxResolver
{
    public function getDefaultSalesTax(): ?TaxRate
    {
        $settings = $this->settings();

        if (! $settings || ! $settings->sales_tax_enabled) {
            return null;
        }

        return $this->rateById($settings->default_sales_tax_rate_id)
            ?: $this->rateById($settings->default_purchase_tax_rate_id)
            ?: TaxRate::query()->where('active', true)->where('is_default', true)->first();
    }

    public function getDefaultPurchaseTax(): ?TaxRate
    {
        $settings = $this->settings();

        if (! $settings || ! $settings->purchase_tax_enabled) {
            return null;
        }

        return $this->rateById($settings->default_purchase_tax_rate_id)
            ?: $this->rateById($settings->default_sales_tax_rate_id)
            ?: TaxRate::query()->where('active', true)->where('is_default', true)->first();
    }

    public function resolveTaxForSalesLine(mixed $product = null, mixed $customer = null, mixed $branch = null): ?TaxRate
    {
        return $this->resolveTax('sale', $product, $customer, null, $branch)
            ?: $this->getDefaultSalesTax();
    }

    public function resolveTaxForPurchaseLine(mixed $product = null, mixed $supplier = null, mixed $branch = null): ?TaxRate
    {
        return $this->resolveTax('purchase', $product, null, $supplier, $branch)
            ?: $this->getDefaultPurchaseTax();
    }

    public function calculateLineTax(float $amount, ?TaxRate $taxRate, ?string $calculationType = null): array
    {
        if (! $taxRate || (float) $taxRate->rate_percent <= 0) {
            return [
                'taxable_amount' => round($amount, 2),
                'tax_amount' => 0.0,
                'total' => round($amount, 2),
            ];
        }

        $rate = (float) $taxRate->rate_percent;
        $inclusive = $calculationType
            ? $calculationType === 'inclusive'
            : (bool) $taxRate->inclusive;

        if ($inclusive) {
            $taxAmount = $amount - ($amount / (1 + ($rate / 100)));
            return [
                'taxable_amount' => round($amount - $taxAmount, 2),
                'tax_amount' => round($taxAmount, 2),
                'total' => round($amount, 2),
            ];
        }

        $taxAmount = $amount * $rate / 100;

        return [
            'taxable_amount' => round($amount, 2),
            'tax_amount' => round($taxAmount, 2),
            'total' => round($amount + $taxAmount, 2),
        ];
    }

    public function calculateDocumentTax(array|Collection $lines, ?string $roundingMethod = null): array
    {
        $lines = collect($lines);
        $roundPerLine = ($roundingMethod ?: $this->settings()?->tax_rounding_method) === 'line';

        $taxable = 0;
        $tax = 0;
        $total = 0;

        foreach ($lines as $line) {
            $taxable += (float) data_get($line, 'taxable_amount', 0);
            $tax += (float) data_get($line, 'tax_amount', 0);
            $total += (float) data_get($line, 'line_total', 0);

            if ($roundPerLine) {
                $tax = round($tax, 2);
                $total = round($total, 2);
            }
        }

        return [
            'taxable_amount' => round($taxable, 2),
            'tax_amount' => round($tax, 2),
            'total' => round($total, 2),
        ];
    }

    private function resolveTax(string $transactionType, mixed $product, mixed $customer, mixed $supplier, mixed $branch): ?TaxRate
    {
        $settings = $this->settings();

        if (! $settings?->advanced_mode) {
            return $this->productTax($product);
        }

        $rule = TaxRule::query()
            ->with('taxRate')
            ->where('active', true)
            ->where('transaction_type', $transactionType)
            ->when($productTaxCategoryId = data_get($product, 'product_tax_category_id'), fn ($q) => $q->where('product_tax_category_id', $productTaxCategoryId))
            ->orderBy('priority')
            ->first();

        return $rule?->taxRate ?: $this->productTax($product);
    }

    private function productTax(mixed $product): ?TaxRate
    {
        $taxClassId = data_get($product, 'tax_class_id');

        if (! $taxClassId) {
            return null;
        }

        return TaxRate::query()
            ->where('tax_class_id', $taxClassId)
            ->where('active', true)
            ->orderByDesc('is_default')
            ->orderBy('rate_percent')
            ->first();
    }

    private function rateById(?string $id): ?TaxRate
    {
        return $id ? TaxRate::query()->where('active', true)->find($id) : null;
    }

    private function settings(): ?TaxSettings
    {
        return TaxSettings::query()->first();
    }
}
