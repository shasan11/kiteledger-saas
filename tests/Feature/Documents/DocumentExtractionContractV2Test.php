<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Services\Documents\Contracts\FieldOrigin;
use App\Services\Documents\Contracts\FieldValidationState;
use App\Services\Documents\DocumentExtractionNormalizerV2;
use App\Services\Documents\Schema\DocumentSchemaRegistry;
use Tests\TestCase;

/**
 * Milestone 1: the v2 contract must keep derived values distinguishable from
 * values actually printed on the document, and must surface disagreement
 * instead of quietly overwriting.
 */
class DocumentExtractionContractV2Test extends TestCase
{
    private function normalizer(): DocumentExtractionNormalizerV2
    {
        return new DocumentExtractionNormalizerV2(new DocumentSchemaRegistry());
    }

    private function bill(array $overrides = []): array
    {
        return array_merge([
            'document_type' => 'purchase_bill',
            'document_number' => 'INV-1042',
            'document_date' => '2026-08-01',
            'currency_code' => 'NPR',
            'party' => ['name' => 'ABC Trading'],
            'lines' => [
                ['description' => 'Widget', 'quantity' => 2, 'rate' => 100, 'amount' => 200, 'tax_amount' => 20],
            ],
            'totals' => ['subtotal' => 200, 'tax_total' => 20, 'grand_total' => 220],
        ], $overrides);
    }

    // ---------- The core defect ----------

    public function test_a_total_printed_on_the_document_is_marked_as_extracted(): void
    {
        $result = $this->normalizer()->normalize($this->bill());

        $grand = $result->field('totals.grand_total');

        $this->assertSame(220.0, $grand->value);
        $this->assertSame(FieldOrigin::Extracted, $grand->origin);
        $this->assertTrue($grand->origin->isFromDocument());
    }

    public function test_a_total_kiteledger_calculates_is_marked_as_derived_not_extracted(): void
    {
        // Document shows lines but no grand total.
        $result = $this->normalizer()->normalize($this->bill([
            'totals' => ['subtotal' => 200, 'tax_total' => 20],
        ]));

        $grand = $result->field('totals.grand_total');

        $this->assertSame(220.0, $grand->value);
        $this->assertSame(FieldOrigin::Derived, $grand->origin, 'A calculated total must never claim to be from the document.');
        $this->assertFalse($grand->origin->isFromDocument());
        $this->assertNotEmpty($grand->warnings, 'The user must be told it was calculated.');
        $this->assertSame('Calculated', $grand->origin->label());
    }

    public function test_a_document_total_that_disagrees_with_the_maths_becomes_a_conflict(): void
    {
        // Document claims 999 but lines add to 220.
        $result = $this->normalizer()->normalize($this->bill([
            'totals' => ['subtotal' => 200, 'tax_total' => 20, 'grand_total' => 999],
        ]));

        $grand = $result->field('totals.grand_total');

        $this->assertSame(999.0, $grand->value, 'The document value must be preserved, not overwritten.');
        $this->assertSame('220', $grand->conflictValue);
        $this->assertSame(FieldValidationState::Conflict, $grand->validationState);
        $this->assertTrue($grand->validationState->isBlocking());
        $this->assertTrue($result->hasBlockingIssues());
    }

    public function test_derived_values_carry_no_source_evidence(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'totals' => ['subtotal' => 200, 'tax_total' => 20],
        ]));

        $grand = $result->field('totals.grand_total');

        $this->assertSame([], $grand->evidence, 'There is nothing on the page to point at.');
        $this->assertFalse($grand->toArray()['has_source_location']);
    }

    // ---------- Line items ----------

    public function test_a_calculated_line_amount_is_flagged_as_derived(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'lines' => [['description' => 'Widget', 'quantity' => 3, 'rate' => 50]],
            'totals' => ['grand_total' => 150],
        ]));

        $line = $result->lines[0];

        $this->assertSame(150.0, $line['amount']);
        $this->assertSame('derived', $line['amount_origin']);
    }

    public function test_a_line_missing_quantity_and_rate_is_marked_for_review(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'lines' => [['description' => 'Mystery item']],
            'totals' => ['grand_total' => 0],
        ]));

        $this->assertTrue($result->lines[0]['needs_review']);
        $this->assertSame('defaulted', $result->lines[0]['quantity_origin']);
    }

    // ---------- Required fields per document type ----------

    public function test_required_fields_are_type_specific(): void
    {
        $registry = new DocumentSchemaRegistry();

        $this->assertTrue($registry->get('purchase_bill')->requires('party.name'));
        // A journal voucher has no counterparty, so requiring one would be noise.
        $this->assertFalse($registry->get('journal_voucher')->requires('party.name'));
    }

    public function test_a_missing_required_field_blocks_and_is_listed_for_review(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'party' => ['name' => null],
        ]));

        $party = $result->field('party.name');

        $this->assertSame(FieldValidationState::Missing, $party->validationState);
        $this->assertTrue($result->hasBlockingIssues());
        $this->assertGreaterThan(0, $result->reviewIssueCount());
    }

    public function test_unsupported_types_are_extractable_but_not_convertible(): void
    {
        $registry = new DocumentSchemaRegistry();

        $this->assertTrue($registry->get('purchase_bill')->isConvertible());
        $this->assertFalse($registry->get('bank_statement')->isConvertible());
        $this->assertFalse($registry->get('journal_voucher')->isConvertible());

        $this->assertContains('bank_statement', $registry->extractableTypes());
        $this->assertNotContains('bank_statement', $registry->convertibleTypes());
    }

    // ---------- Confidence and review focus ----------

    public function test_low_confidence_fields_are_flagged_for_review(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'field_confidence' => ['document_date' => 0.31],
        ]));

        $this->assertSame(FieldValidationState::LowConfidence, $result->field('document_date')->validationState);
        $this->assertTrue($result->field('document_date')->needsReview());
    }

    public function test_an_unparseable_date_is_a_conflict_not_a_silent_null(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'document_date' => 'the 3rd of never',
        ]));

        $date = $result->field('document_date');

        $this->assertSame(FieldValidationState::Conflict, $date->validationState);
        $this->assertSame('the 3rd of never', $date->conflictValue);
    }

    public function test_blocking_issues_sort_above_advisory_ones(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'party' => ['name' => null],
            'field_confidence' => ['document_number' => 0.2],
        ]));

        $issues = $result->fieldsNeedingReview();

        $this->assertTrue($issues[0]->validationState->isBlocking(), 'The user should be sent to the blocker first.');
    }

    public function test_a_clean_document_reports_nothing_to_review(): void
    {
        $result = $this->normalizer()->normalize($this->bill());

        $this->assertSame(0, $result->reviewIssueCount());
        $this->assertFalse($result->hasBlockingIssues());
    }

    // ---------- User corrections ----------

    public function test_a_user_edit_preserves_the_original_extracted_value(): void
    {
        $result = $this->normalizer()->normalize($this->bill());

        $corrected = $result->field('document_number')->withUserValue('INV-9999');

        $this->assertSame('INV-9999', $corrected->value);
        $this->assertSame('INV-1042', $corrected->originalValue, 'The document value must survive the edit.');
        $this->assertSame(FieldOrigin::User, $corrected->origin);
        $this->assertTrue($corrected->wasCorrected());
        $this->assertSame('INV-1042', $corrected->toArray()['original_value']);
    }

    // ---------- Output safety ----------

    public function test_raw_confidence_is_hidden_from_ordinary_users(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'field_confidence' => ['document_number' => 0.91],
        ]));

        $public = $result->toArray();
        $debug = $result->toArray(includeDebug: true);

        $this->assertArrayNotHasKey('confidence', $public['fields']['document_number']);
        $this->assertSame(0.91, $debug['fields']['document_number']['confidence']);
        $this->assertNull($public['overall_confidence']);
    }

    public function test_result_declares_its_schema_version(): void
    {
        $payload = $this->normalizer()->normalize($this->bill())->toArray();

        $this->assertSame('2.0', $payload['schema_version']);
        $this->assertSame('purchase_bill', $payload['conversion_target']);
        $this->assertTrue($payload['is_convertible']);
    }

    public function test_invented_bounding_boxes_are_rejected(): void
    {
        $result = $this->normalizer()->normalize($this->bill([
            'evidence' => [
                'document_number' => [
                    // Out of the normalized 0..1 range: must not be trusted.
                    ['page' => 1, 'text' => 'Invoice No: INV-1042', 'bounding_box' => ['x' => 5, 'y' => 2, 'width' => 9, 'height' => 9]],
                ],
            ],
        ]));

        $evidence = $result->field('document_number')->evidence;

        $this->assertCount(1, $evidence);
        $this->assertSame('Invoice No: INV-1042', $evidence[0]->text);
        $this->assertNull($evidence[0]->boundingBox, 'An out-of-range box must be discarded, not coerced.');
        $this->assertFalse($evidence[0]->hasLocation());
    }
}
