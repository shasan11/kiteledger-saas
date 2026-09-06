<?php

declare(strict_types=1);

namespace App\Services\Documents\Schema;

use Illuminate\Support\Str;

/**
 * Stage one of extraction: what kind of document is this?
 *
 * Deliberately deterministic rather than a model call. Accounting documents
 * announce themselves in their own heading — "TAX INVOICE", "PURCHASE ORDER",
 * "STATEMENT OF ACCOUNT" — so classifying from the text layer is both more
 * reliable and free, where a second provider round trip would add seconds to
 * every scan and a second thing to go wrong.
 *
 * It answers only when confident. An ambiguous document falls through to the
 * generic schema, which is exactly today's behaviour, so a wrong guess never
 * narrows the extraction to the wrong shape.
 */
final class DocumentTypeClassifier
{
    /**
     * Phrases that identify a type, strongest first.
     *
     * Order matters: "purchase invoice" must be tested before "invoice", and
     * "credit note" before "note", or the broader pattern wins and the schema
     * is narrowed to the wrong document.
     *
     * @var array<int, array{0: string, 1: string[]}>
     */
    private const SIGNATURES = [
        ['bank_statement', ['statement of account', 'bank statement', 'account statement', 'opening balance brought forward']],
        ['journal_voucher', ['journal voucher', 'journal entry', 'jv no', 'debit                credit']],
        ['credit_note', ['credit note', 'credit memo']],
        ['debit_note', ['debit note', 'debit memo']],
        ['purchase_order', ['purchase order', 'po number', 'p.o. no']],
        ['sales_order', ['sales order', 'so number']],
        ['quotation', ['quotation', 'quote no', 'proforma', 'estimate']],
        ['warehouse_transfer', ['stock transfer', 'warehouse transfer', 'transfer note', 'goods transfer']],
        ['inventory_adjustment', ['stock adjustment', 'inventory adjustment', 'stock count']],
        ['customer_payment_slip', ['receipt voucher', 'payment received', 'cash receipt', 'official receipt']],
        ['supplier_payment_slip', ['payment voucher', 'remittance advice', 'payment advice']],
        ['purchase_bill', ['purchase invoice', 'purchase bill', 'supplier invoice', 'vendor invoice']],
        ['sales_invoice', ['tax invoice', 'sales invoice', 'invoice no', 'invoice number', 'invoice date']],
        ['expense_receipt', ['receipt', 'thank you for your purchase']],
    ];

    /**
     * How much text is inspected.
     *
     * The heading is at the top; scanning the whole document would let a
     * passing mention of "purchase order" in a terms paragraph outrank the
     * actual title.
     */
    private const INSPECT_CHARS = 1200;

    public function __construct(
        private readonly DocumentSchemaRegistry $registry,
    ) {}

    /**
     * The document type, or null when nothing matched clearly enough.
     */
    public function classify(string $text): ?string
    {
        $haystack = $this->normalize(mb_substr($text, 0, self::INSPECT_CHARS));

        if ($haystack === '') {
            return null;
        }

        foreach (self::SIGNATURES as [$type, $phrases]) {
            foreach ($phrases as $phrase) {
                if (str_contains($haystack, $phrase) && $this->registry->has($type)) {
                    return $type;
                }
            }
        }

        return null;
    }

    /**
     * Page-boundary markers are stripped so a heading split across the marker
     * still matches, and whitespace is collapsed so "TAX   INVOICE" reads the
     * same as "Tax Invoice".
     */
    private function normalize(string $text): string
    {
        $text = (string) preg_replace('/---\s*PAGE\s*\d+\s*---/i', ' ', $text);

        return Str::lower(trim((string) preg_replace('/\s+/', ' ', $text)));
    }
}
