<?php

namespace App\Services\Pos;

use App\Models\TaxRate;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class PosCartCalculatorService
{
    public function calculate(array $items, array $payments = [], float $roundOff = 0): array
    {
        if (count($items) < 1) {
            throw new InvalidArgumentException('Cannot calculate totals for an empty cart.');
        }

        $taxRates = TaxRate::query()
            ->whereIn('id', collect($items)->pluck('tax_rate_id')->filter()->all())
            ->get()
            ->keyBy('id');

        $lineItems = collect($items)->map(function (array $item) use ($taxRates) {
            $qty = round((float) ($item['qty'] ?? 0), 4);
            $unitPrice = round((float) ($item['unit_price'] ?? 0), 2);
            $discountPercent = round((float) ($item['discount_percent'] ?? 0), 4);

            if ($qty <= 0) {
                throw new InvalidArgumentException('Product quantity must be greater than zero.');
            }

            $baseAmount = round($qty * $unitPrice, 2);
            $discountAmount = round((float) ($item['discount_amount'] ?? ($baseAmount * ($discountPercent / 100))), 2);
            $discountAmount = min($discountAmount, $baseAmount);
            $taxableAmount = max($baseAmount - $discountAmount, 0);
            $taxRate = $taxRates->get($item['tax_rate_id'] ?? null);
            $taxAmount = round($taxableAmount * ((float) ($taxRate?->rate_percent ?? 0) / 100), 2);
            $lineTotal = round($taxableAmount + $taxAmount, 2);

            return [
                ...$item,
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'line_total' => $lineTotal,
            ];
        });

        $subtotal = round($lineItems->sum(fn (array $item) => $item['qty'] * $item['unit_price']), 2);
        $discountTotal = round($lineItems->sum('discount_amount'), 2);
        $taxTotal = round($lineItems->sum('tax_amount'), 2);
        $grandTotal = round($lineItems->sum('line_total') + $roundOff, 2);
        $paidTotal = round(collect($payments)->sum(fn (array $payment) => (float) ($payment['amount'] ?? 0)), 2);
        $balanceDue = max(round($grandTotal - $paidTotal, 2), 0);
        $changeAmount = max(round($paidTotal - $grandTotal, 2), 0);

        return [
            'items' => $lineItems->values()->all(),
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'tax_total' => $taxTotal,
            'round_off' => round($roundOff, 2),
            'grand_total' => $grandTotal,
            'paid_total' => $paidTotal,
            'balance_due' => $balanceDue,
            'change_amount' => $changeAmount,
            'payment_status' => $this->paymentStatus($grandTotal, $paidTotal),
        ];
    }

    public function summarizePayments(Collection $payments): array
    {
        return [
            'cash' => round($payments->where('payment_method', 'cash')->sum('amount'), 2),
            'card' => round($payments->where('payment_method', 'card')->sum('amount'), 2),
            'online' => round($payments->where('payment_method', 'online')->sum('amount'), 2),
        ];
    }

    private function paymentStatus(float $grandTotal, float $paidTotal): string
    {
        if ($paidTotal <= 0) {
            return 'unpaid';
        }

        if ($paidTotal + 0.009 >= $grandTotal) {
            return 'paid';
        }

        return 'partial';
    }
}
