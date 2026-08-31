<?php

namespace App\Services\SaaS;

use App\Models\Central\TenantInvoice;

/**
 * Builds the parts of an invoice a tax authority expects to see, rather than
 * the parts a customer merely finds useful.
 *
 * Modelled on EN 16931 (the European semantic invoice standard, and the closest
 * thing to a common baseline internationally): a document-type label, a tax
 * breakdown per rate showing the taxable base separately from the tax amount,
 * an exemption reason whenever no tax is charged, an explicit statement when
 * prices are tax-inclusive, and any rounding shown as its own adjustment.
 *
 * The SaaS billing engine charges a single tax rate, so the breakdown has one
 * row today. It is still emitted as a list so multi-rate invoices need only a
 * richer source of data, not a different template.
 */
class InvoiceCompliancePresenter
{
    /** Cent-level tolerance: below this, a difference is float noise, not money. */
    private const EPSILON = 0.005;

    /** @return array<string, mixed> */
    public function present(TenantInvoice $invoice): array
    {
        $snapshot = $invoice->tax_snapshot ?? [];
        $subtotal = (float) $invoice->subtotal;
        $discount = (float) $invoice->discount;
        $tax = (float) $invoice->tax;
        $total = (float) $invoice->total;
        $taxable = round($subtotal - $discount, 2);

        $label = $this->firstFilled(
            data_get($snapshot, 'invoice_customization.tax_label'),
            data_get($snapshot, 'billing.tax_name'),
        ) ?: 'Tax';

        // A rate stored on the invoice wins. Older rows predate the setting, so
        // the effective rate is recovered from the amounts actually charged.
        $rate = (float) data_get($snapshot, 'billing.tax_rate', 0);
        if ($rate <= 0 && abs($tax) >= self::EPSILON && abs($taxable) >= self::EPSILON) {
            $rate = round($tax / $taxable * 100, 2);
        }

        $charged = abs($tax) >= self::EPSILON;
        $inclusive = (bool) data_get($snapshot, 'billing.prices_include_tax', false);

        $rounding = round($total - ($taxable + $tax), 2);

        return [
            'document_type' => $this->documentType($invoice, $charged),
            'tax_charged' => $charged,
            'tax_label' => $label,
            'tax_rate' => $charged ? $rate : 0.0,
            'prices_include_tax' => $inclusive && $charged,
            'taxable_amount' => $taxable,
            'tax_amount' => round($tax, 2),
            'breakdown' => $charged
                ? [[
                    'label' => $label.' '.$this->formatRate($rate),
                    'rate' => $rate,
                    'taxable' => $taxable,
                    'amount' => round($tax, 2),
                ]]
                : [],
            'exemption_reason' => $charged ? null : $this->exemptionReason($snapshot),
            'rounding' => abs($rounding) >= self::EPSILON ? $rounding : null,
            'lines' => $this->lineTax($invoice, $rate, $tax, $charged),
            'amount_in_words' => $this->inWords((float) $invoice->total, (string) $invoice->currency),
            'payment_reference' => $invoice->invoice_number,
        ];
    }

    /**
     * Per-line tax at a single rate. The final line absorbs any rounding
     * difference so the column sums exactly to the tax on the invoice — a
     * breakdown that does not add up is worse than no breakdown at all.
     *
     * @return array<int, array<string, float>>
     */
    private function lineTax(TenantInvoice $invoice, float $rate, float $tax, bool $charged): array
    {
        $lines = $invoice->relationLoaded('lines') && $invoice->lines->isNotEmpty()
            ? $invoice->lines->map(fn ($line): float => (float) $line->amount)->all()
            : collect($invoice->line_items_snapshot ?? [])->map(fn ($line): float => (float) data_get($line, 'amount', 0))->all();

        if ($lines === []) {
            return [];
        }

        $allocated = [];
        $running = 0.0;
        $last = count($lines) - 1;

        foreach ($lines as $index => $net) {
            $amount = $charged ? round($net * $rate / 100, 2) : 0.0;
            if ($index === $last && $charged) {
                $amount = round($tax - $running, 2);
            }
            $running = round($running + $amount, 2);
            $allocated[$index] = ['rate' => $charged ? $rate : 0.0, 'amount' => $amount];
        }

        return $allocated;
    }

    private function documentType(TenantInvoice $invoice, bool $taxCharged): string
    {
        if ((float) $invoice->total < 0) {
            return 'Credit note';
        }

        // "Tax invoice" is the required wording in most VAT/GST jurisdictions
        // once tax is actually charged on the document.
        return $taxCharged ? 'Tax invoice' : 'Invoice';
    }

    /** @param array<string, mixed> $snapshot */
    private function exemptionReason(array $snapshot): string
    {
        return $this->firstFilled(
            data_get($snapshot, 'billing.tax_exemption_reason'),
            data_get($snapshot, 'invoice_customization.tax_exemption_reason'),
        ) ?: 'No tax charged on this invoice.';
    }

    private function formatRate(float $rate): string
    {
        return rtrim(rtrim(number_format($rate, 2, '.', ''), '0'), '.').'%';
    }

    /**
     * Spelled-out total, expected on invoices across South Asia and the Gulf.
     * Skipped rather than approximated when ext-intl is unavailable.
     */
    private function inWords(float $total, string $currency): ?string
    {
        if (! class_exists(\NumberFormatter::class)) {
            return null;
        }

        $spell = new \NumberFormatter('en', \NumberFormatter::SPELLOUT);
        $units = (int) floor(abs($total));
        $fraction = (int) round((abs($total) - $units) * 100);

        $words = ucfirst((string) $spell->format($units));
        if ($fraction > 0) {
            $words .= ' and '.$spell->format($fraction).'/100';
        }

        return strtoupper($currency).' '.$words.($total < 0 ? ' (credit)' : ' only');
    }

    private function firstFilled(mixed ...$values): mixed
    {
        foreach ($values as $value) {
            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }
}
