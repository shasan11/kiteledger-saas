<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Contracts\ExtractedField;
use App\Services\Documents\DocumentExtractionNormalizerV2;
use App\Services\Documents\Pipeline\DocumentPage;
use App\Services\Documents\Pipeline\FieldConfidenceCalculator;
use App\Services\Documents\Pipeline\FieldProvenanceResolver;
use App\Services\Documents\Pipeline\PageKind;
use App\Services\Documents\Review\DocumentIssueCode;
use App\Services\Documents\Review\DocumentValidationService;
use Tests\TestCase;

/**
 * Phase 3: deterministic accounting checks, unknown-versus-zero, provenance and
 * evidence-based confidence.
 */
class DocumentAccountingValidationTest extends TestCase
{
    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function structured(array $overrides = []): array
    {
        return array_replace_recursive([
            'document_type' => 'sales_invoice',
            'fields' => [
                'document_date' => $this->field('document_date', '2026-08-01'),
                'party.name' => $this->field('party.name', 'ABC Trading'),
                'document_number' => $this->field('document_number', 'INV-1042'),
                'totals.subtotal' => $this->field('totals.subtotal', 1000.0),
                'totals.tax_total' => $this->field('totals.tax_total', 50.0),
                'totals.discount_total' => $this->field('totals.discount_total', 0.0),
                'totals.shipping' => $this->field('totals.shipping', 0.0),
                'totals.grand_total' => $this->field('totals.grand_total', 1050.0),
                'totals.paid_amount' => $this->field('totals.paid_amount', 0.0),
                'totals.balance_due' => $this->field('totals.balance_due', 1050.0),
            ],
            'lines' => [],
        ], $overrides);
    }

    /** @return array<string, mixed> */
    private function field(string $key, mixed $value, string $origin = 'extracted'): array
    {
        return [
            'key' => $key,
            'value' => $value,
            'origin' => $origin,
            'state' => 'ok',
            'needs_review' => false,
            'warnings' => [],
            'evidence' => [],
        ];
    }

    /** @param array<string, mixed> $structured @return string[] */
    private function issueCodes(array $structured): array
    {
        return array_column(
            app(DocumentValidationService::class)->revalidate($structured)['issues'] ?? [],
            'code',
        );
    }

    // ---------- Coded issues ----------

    public function test_a_consistent_invoice_raises_no_arithmetic_issues(): void
    {
        $codes = $this->issueCodes($this->structured());

        $this->assertNotContains(DocumentIssueCode::TotalMismatch->value, $codes);
        $this->assertNotContains(DocumentIssueCode::BalanceMismatch->value, $codes);
    }

    public function test_a_total_that_does_not_add_up_is_flagged_and_blocks_conversion(): void
    {
        $codes = $this->issueCodes($this->structured([
            'fields' => ['totals.grand_total' => $this->field('totals.grand_total', 9999.0)],
        ]));

        $this->assertContains(DocumentIssueCode::TotalMismatch->value, $codes);
        $this->assertTrue(DocumentIssueCode::TotalMismatch->blocksConversion());
    }

    public function test_paid_plus_balance_must_reconcile_to_the_total(): void
    {
        $codes = $this->issueCodes($this->structured([
            'fields' => [
                'totals.paid_amount' => $this->field('totals.paid_amount', 200.0),
                // 200 + 1050 does not equal the 1050 grand total.
                'totals.balance_due' => $this->field('totals.balance_due', 1050.0),
            ],
        ]));

        $this->assertContains(DocumentIssueCode::BalanceMismatch->value, $codes);
    }

    public function test_a_derived_balance_is_not_checked_against_the_total_it_came_from(): void
    {
        // Comparing a derived figure to its own inputs can never disagree, so
        // the check would only ever produce noise.
        $codes = $this->issueCodes($this->structured([
            'fields' => [
                'totals.paid_amount' => $this->field('totals.paid_amount', 200.0, 'derived'),
                'totals.balance_due' => $this->field('totals.balance_due', 850.0, 'derived'),
            ],
        ]));

        $this->assertNotContains(DocumentIssueCode::BalanceMismatch->value, $codes);
    }

    public function test_a_line_amount_that_contradicts_quantity_and_rate_is_flagged(): void
    {
        $codes = $this->issueCodes($this->structured([
            'lines' => [[
                'description' => 'Widget',
                'quantity' => 10,
                'rate' => 5,
                'discount' => 0,
                'tax_amount' => 0,
                // 10 x 5 is 50, not 500.
                'amount' => 500,
                'amount_origin' => 'extracted',
            ]],
        ]));

        $this->assertContains(DocumentIssueCode::LineAmountMismatch->value, $codes);
    }

    public function test_a_derived_line_amount_is_not_checked_against_its_own_inputs(): void
    {
        $codes = $this->issueCodes($this->structured([
            'lines' => [[
                'description' => 'Widget',
                'quantity' => 10,
                'rate' => 5,
                'amount' => 50,
                'amount_origin' => 'derived',
            ]],
        ]));

        $this->assertNotContains(DocumentIssueCode::LineAmountMismatch->value, $codes);
    }

    public function test_line_tolerance_scales_so_large_lines_are_not_false_flagged(): void
    {
        // Per-unit rounding accumulates; a flat 0.05 allowance would report
        // every six-figure line as broken.
        $codes = $this->issueCodes($this->structured([
            'lines' => [[
                'description' => 'Bulk order',
                'quantity' => 1000,
                'rate' => 133.333,
                'amount' => 133333.30,
                'amount_origin' => 'extracted',
            ]],
        ]));

        $this->assertNotContains(DocumentIssueCode::LineAmountMismatch->value, $codes);
    }

    public function test_an_unbalanced_journal_entry_is_flagged_and_blocks_conversion(): void
    {
        $codes = $this->issueCodes($this->structured([
            'document_type' => 'journal_voucher',
            'journal_entry' => [
                'lines' => [
                    ['account_name' => 'Cash', 'debit' => 500, 'credit' => null],
                    ['account_name' => 'Sales', 'debit' => null, 'credit' => 400],
                ],
            ],
        ]));

        $this->assertContains(DocumentIssueCode::JournalUnbalanced->value, $codes);
        $this->assertTrue(DocumentIssueCode::JournalUnbalanced->blocksConversion());
    }

    public function test_a_balanced_journal_entry_passes(): void
    {
        $codes = $this->issueCodes($this->structured([
            'document_type' => 'journal_voucher',
            'journal_entry' => [
                'lines' => [
                    ['account_name' => 'Cash', 'debit' => 500, 'credit' => null],
                    ['account_name' => 'Sales', 'debit' => null, 'credit' => 500],
                ],
            ],
        ]));

        $this->assertNotContains(DocumentIssueCode::JournalUnbalanced->value, $codes);
    }

    public function test_a_stated_tax_total_is_checked_against_the_line_tax(): void
    {
        $codes = $this->issueCodes($this->structured([
            'fields' => ['totals.tax_total' => $this->field('totals.tax_total', 200.0)],
            'lines' => [
                ['description' => 'A', 'quantity' => 1, 'rate' => 500, 'tax_amount' => 25, 'amount' => 525, 'amount_origin' => 'extracted'],
                ['description' => 'B', 'quantity' => 1, 'rate' => 500, 'tax_amount' => 25, 'amount' => 525, 'amount_origin' => 'extracted'],
            ],
        ]));

        $this->assertContains(DocumentIssueCode::TaxMismatch->value, $codes);
    }

    public function test_incomplete_coverage_becomes_a_review_issue(): void
    {
        $codes = $this->issueCodes($this->structured([
            'coverage' => ['complete' => false, 'pages_failed' => [3, 4]],
        ]));

        $this->assertContains(DocumentIssueCode::IncompleteExtraction->value, $codes);
    }

    // ---------- Unknown versus zero ----------

    public function test_an_unread_line_tax_is_recorded_as_defaulted_not_as_a_real_zero(): void
    {
        /*
         * The distinction that matters: a tax amount the document did not show
         * is not the same as a zero-rated line. Collapsing both to 0 makes an
         * unread tax figure indistinguishable from a genuine exemption, and the
         * reviewer is never told to look.
         */
        $result = app(DocumentExtractionNormalizerV2::class)->normalize([
            'document_type' => 'sales_invoice',
            'lines' => [
                ['description' => 'Unknown tax', 'quantity' => 1, 'rate' => 100, 'amount' => 100],
                ['description' => 'Explicit zero', 'quantity' => 1, 'rate' => 100, 'tax_amount' => 0, 'amount' => 100],
            ],
        ])->toArray(includeDebug: true);

        $lines = $result['lines'];

        $this->assertSame('defaulted', $lines[0]['tax_amount_origin']);
        $this->assertSame('extracted', $lines[1]['tax_amount_origin']);

        // Both carry a working value of 0, but only one of them means it.
        $this->assertSame(0.0, (float) $lines[0]['tax_amount']);
        $this->assertSame(0.0, (float) $lines[1]['tax_amount']);
    }

    public function test_an_unread_discount_is_distinguishable_from_a_stated_discount(): void
    {
        $result = app(DocumentExtractionNormalizerV2::class)->normalize([
            'document_type' => 'sales_invoice',
            'lines' => [
                ['description' => 'No discount shown', 'quantity' => 1, 'rate' => 100, 'amount' => 100],
                ['description' => 'Discounted', 'quantity' => 1, 'rate' => 100, 'discount' => 10, 'amount' => 90],
            ],
        ])->toArray(includeDebug: true);

        $this->assertSame('defaulted', $result['lines'][0]['discount_origin']);
        $this->assertSame('extracted', $result['lines'][1]['discount_origin']);
    }

    // ---------- Provenance ----------

    /** @param array<int, array{0: PageKind, 1: string}> $pages */
    private function pages(array $pages): array
    {
        return array_map(
            static fn (array $page, int $index) => new DocumentPage($index + 1, $page[0], $page[1], mb_strlen($page[1])),
            $pages,
            array_keys($pages),
        );
    }

    public function test_a_value_is_cited_to_the_page_it_actually_appears_on(): void
    {
        $evidence = app(FieldProvenanceResolver::class)->resolve('INV-1042', $this->pages([
            [PageKind::NativeText, 'Cover page with no reference on it at all.'],
            [PageKind::NativeText, 'Invoice INV-1042 issued to ABC Trading on 1 August.'],
        ]));

        $this->assertNotNull($evidence);
        $this->assertSame(2, $evidence->page);
        $this->assertStringContainsString('inv-1042', $evidence->text);
    }

    public function test_an_amount_is_located_despite_thousands_separators(): void
    {
        // Without this, every numeric field would fail to find itself and the
        // pipeline would fall back to trusting the model's claimed page.
        $evidence = app(FieldProvenanceResolver::class)->resolve(1234.5, $this->pages([
            [PageKind::NativeText, 'Grand total 1,234.50 due on receipt.'],
        ]));

        $this->assertNotNull($evidence);
        $this->assertSame(1, $evidence->page);
    }

    public function test_a_value_that_is_not_on_any_page_is_not_given_a_citation(): void
    {
        // A fabricated citation is worse than none: it makes an invented value
        // look verified.
        $this->assertNull(app(FieldProvenanceResolver::class)->resolve('INV-9999', $this->pages([
            [PageKind::NativeText, 'Invoice INV-1042 issued to ABC Trading.'],
        ])));
    }

    public function test_no_bounding_box_is_invented_for_a_text_layer_match(): void
    {
        $evidence = app(FieldProvenanceResolver::class)->resolve('ABC Trading', $this->pages([
            [PageKind::NativeText, 'Billed to ABC Trading, Dubai.'],
        ]));

        $this->assertNotNull($evidence);
        $this->assertFalse($evidence->hasLocation(), 'A text layer carries no geometry to highlight.');
    }

    // ---------- Confidence ----------

    public function test_confidence_rises_when_the_value_is_found_in_the_document_text(): void
    {
        $calculator = app(FieldConfidenceCalculator::class);
        $field = ExtractedField::extracted('document_number', 'INV-1042', 0.7);

        $this->assertGreaterThan(
            $calculator->forField($field, locatedInText: false, sourcePageKind: PageKind::NativeText),
            $calculator->forField($field, locatedInText: true, sourcePageKind: PageKind::NativeText),
        );
    }

    public function test_a_value_read_from_a_scan_is_trusted_less_than_one_read_from_text(): void
    {
        // Vision transcription is where digits get misread, however sure the
        // model sounds about it.
        $calculator = app(FieldConfidenceCalculator::class);
        $field = ExtractedField::extracted('totals.grand_total', 1050.0, 0.95);

        $this->assertLessThan(
            $calculator->forField($field, sourcePageKind: PageKind::NativeText),
            $calculator->forField($field, sourcePageKind: PageKind::ScannedImage),
        );
    }

    public function test_a_high_model_score_cannot_survive_failed_arithmetic(): void
    {
        $calculator = app(FieldConfidenceCalculator::class);

        $confident = ExtractedField::extracted('totals.grand_total', 9999.0, 0.99);
        $conflicted = $confident->withConflict('1050.00', 'Totals do not reconcile.');

        $score = $calculator->forField($conflicted, sourcePageKind: PageKind::NativeText);

        $this->assertLessThan(0.6, $score);
        $this->assertSame('Low', $calculator->label($score));
    }

    public function test_a_missing_value_has_no_confidence_at_all(): void
    {
        $calculator = app(FieldConfidenceCalculator::class);
        $score = $calculator->forField(ExtractedField::missing('document_number'));

        $this->assertSame(0.0, $score);
        $this->assertSame('Not found', $calculator->label($score));
    }

    public function test_a_user_confirmed_value_is_certain(): void
    {
        $calculator = app(FieldConfidenceCalculator::class);
        $field = ExtractedField::extracted('document_number', 'INV-1', 0.2)->withUserValue('INV-2');

        $this->assertSame(1.0, $calculator->forField($field));
    }

    public function test_a_derived_figure_is_never_presented_as_a_confident_reading(): void
    {
        $calculator = app(FieldConfidenceCalculator::class);
        $field = ExtractedField::derived('totals.grand_total', 1050.0, 'Calculated from the subtotal and tax.');

        $this->assertLessThanOrEqual(0.65, $calculator->forField($field, locatedInText: true));
    }
}
