<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Schema\DocumentTypeClassifier;
use App\Services\Documents\Schema\DocumentTypePrompt;
use Tests\TestCase;

/**
 * Phase 3: two-stage extraction — classify, then apply that type's schema.
 *
 * Stage one is deterministic on purpose. Accounting documents announce
 * themselves in their own heading, so reading the heading is more reliable than
 * a model call and adds no latency to every scan.
 */
class DocumentTypeClassificationTest extends TestCase
{
    private function classify(string $text): ?string
    {
        return app(DocumentTypeClassifier::class)->classify($text);
    }

    public function test_common_document_headings_are_recognised(): void
    {
        $this->assertSame('sales_invoice', $this->classify('TAX INVOICE
Invoice No: INV-1042'));
        $this->assertSame('purchase_bill', $this->classify('SUPPLIER INVOICE from ABC Trading'));
        $this->assertSame('purchase_order', $this->classify('PURCHASE ORDER
PO Number 8891'));
        $this->assertSame('credit_note', $this->classify('CREDIT NOTE against invoice 1042'));
        $this->assertSame('bank_statement', $this->classify('STATEMENT OF ACCOUNT
Opening balance brought forward'));
        $this->assertSame('journal_voucher', $this->classify('JOURNAL VOUCHER
Narration: month end accrual'));
    }

    public function test_a_more_specific_heading_wins_over_a_broader_one(): void
    {
        // "purchase invoice" contains "invoice"; if the broader pattern won,
        // a supplier bill would be extracted with a customer schema.
        $this->assertSame('purchase_bill', $this->classify('PURCHASE INVOICE
Invoice No: PB-77'));
        $this->assertSame('credit_note', $this->classify('CREDIT NOTE
Original Invoice No: INV-9'));
    }

    public function test_page_markers_do_not_hide_the_heading(): void
    {
        $this->assertSame(
            'sales_invoice',
            $this->classify("--- PAGE 1 ---\nTAX INVOICE\nInvoice No: INV-1042"),
        );
    }

    public function test_an_ambiguous_document_is_not_guessed_at(): void
    {
        // Falling through to the generic schema is today's behaviour; a
        // confident wrong guess would narrow the extraction to the wrong shape
        // and lose whole sections.
        $this->assertNull($this->classify('Some correspondence about a delivery next week.'));
        $this->assertNull($this->classify(''));
    }

    public function test_only_the_heading_region_is_inspected(): void
    {
        // A passing mention of another document type deep in the terms must not
        // outrank the actual title at the top.
        $text = "TAX INVOICE\nInvoice No: INV-1042\n"
            .str_repeat('Standard terms and conditions apply. ', 60)
            ."\nThis invoice may be raised against a purchase order.";

        $this->assertSame('sales_invoice', $this->classify($text));
    }

    // ---------- Type-specific schema ----------

    public function test_a_payment_slip_schema_omits_line_items(): void
    {
        // Offering a line-items array to a document that has none invites the
        // model to fill it in rather than leave it null.
        $prompt = app(DocumentTypePrompt::class)->build('customer_payment_slip');

        $this->assertStringNotContainsString('"lines"', $prompt);
        $this->assertStringContainsString('"payment"', $prompt);
        $this->assertStringContainsString('Customer payment', $prompt);
    }

    public function test_a_journal_voucher_schema_omits_party_and_totals(): void
    {
        $prompt = app(DocumentTypePrompt::class)->build('journal_voucher');

        $this->assertStringNotContainsString('"party"', $prompt);
        $this->assertStringNotContainsString('"totals"', $prompt);
        $this->assertStringContainsString('"journal_entry"', $prompt);
    }

    public function test_a_bank_statement_schema_asks_for_transactions(): void
    {
        $prompt = app(DocumentTypePrompt::class)->build('bank_statement');

        $this->assertStringContainsString('"transactions"', $prompt);
        $this->assertStringNotContainsString('"lines"', $prompt);
    }

    public function test_every_type_schema_states_the_unknown_versus_zero_rule(): void
    {
        foreach (['sales_invoice', 'purchase_bill', 'journal_voucher', 'bank_statement'] as $type) {
            $this->assertStringContainsString(
                'Use 0 ONLY where the document shows an explicit zero',
                app(DocumentTypePrompt::class)->build($type),
                "The {$type} schema must not invite a zero for an unread value.",
            );
        }
    }

    public function test_an_unknown_type_falls_back_to_the_generic_schema(): void
    {
        $prompt = app(DocumentTypePrompt::class)->build('something_new');

        $this->assertStringContainsString('document_type', $prompt);
        $this->assertFalse(app(DocumentTypePrompt::class)->supports('something_new'));
    }
}
