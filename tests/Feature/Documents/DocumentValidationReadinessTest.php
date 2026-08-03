<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Models\Permission;
use App\Models\User;
use App\Services\Documents\DocumentExtractionNormalizerV2;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\Review\DocumentReadinessService;
use App\Services\Documents\Review\DocumentReviewService;
use App\Services\Documents\Review\DocumentValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Milestone 3 completion (corrections) and Milestone 4 (deterministic
 * validation + readiness).
 */
class DocumentValidationReadinessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (DocumentPermissionService::ALL as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function userWith(array $permissions): User
    {
        $user = User::factory()->create();

        foreach ($permissions as $p) {
            $user->givePermissionTo($p);
        }

        return $user->fresh();
    }

    private function makeDocument(array $extracted = [], string $status = 'needs_review'): DocumentUpload
    {
        $doc = DocumentUpload::create([
            'label' => 'ABC bill',
            'original_file_name' => 'bill.pdf',
            'file_path' => 'documents/2026/bill.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1000,
            'status' => $status,
            'document_type' => 'purchase_bill',
        ]);

        $payload = array_merge([
            'document_type' => 'purchase_bill',
            'document_number' => 'INV-1042',
            'document_date' => '2026-08-01',
            'currency_code' => 'NPR',
            'party' => ['name' => 'ABC Trading'],
            'lines' => [['description' => 'Widget', 'quantity' => 2, 'rate' => 100, 'amount' => 200]],
            'totals' => ['subtotal' => 200, 'grand_total' => 200],
        ], $extracted);

        $v2 = app(DocumentExtractionNormalizerV2::class)->normalize($payload);

        DocumentExtraction::create([
            'document_upload_id' => $doc->id,
            'status' => 'completed',
            'stage' => 'ready_for_review',
            'schema_version' => '2.0',
            'structured_json' => $v2->toArray(includeDebug: true),
            'normalized_json' => ['document_type' => 'purchase_bill'],
            'review_issue_count' => $v2->reviewIssueCount(),
        ]);

        return $doc->fresh();
    }

    // ---------- Corrections (completes Milestone 3) ----------

    public function test_a_correction_is_persisted_and_preserves_the_document_value(): void
    {
        $doc = $this->makeDocument();

        $result = app(DocumentReviewService::class)->applyCorrections($doc, [
            'document_number' => 'INV-9999',
        ]);

        $this->assertSame(1, $result['applied']);

        $field = $doc->fresh()->extraction->structured_json['fields']['document_number'];

        $this->assertSame('INV-9999', $field['value']);
        $this->assertSame('INV-1042', $field['original_value'], 'The document value must survive.');
        $this->assertSame('user', $field['origin']);
        $this->assertTrue($field['edited_by_user']);
    }

    public function test_unknown_fields_are_ignored_rather_than_written(): void
    {
        $doc = $this->makeDocument();

        $result = app(DocumentReviewService::class)->applyCorrections($doc, [
            'totals.secret_backdoor' => 'x',
            'id' => 'tampered',
        ]);

        $this->assertSame(0, $result['applied']);
        $this->assertContains('id', $result['ignored']);
    }

    public function test_correcting_the_last_blocker_clears_the_review_state(): void
    {
        $doc = $this->makeDocument(['party' => ['name' => null]]);

        $this->assertSame('needs_review', $doc->status);

        app(DocumentReviewService::class)->applyCorrections($doc, ['party.name' => 'ABC Trading']);

        $this->assertSame('extracted', $doc->fresh()->status);
        $this->assertSame(0, $doc->fresh()->extraction->review_issue_count);
    }

    public function test_clearing_a_required_field_reinstates_the_blocker(): void
    {
        $doc = $this->makeDocument();

        app(DocumentReviewService::class)->applyCorrections($doc, ['party.name' => '']);

        $field = $doc->fresh()->extraction->structured_json['fields']['party.name'];

        $this->assertSame('missing', $field['state']);
        $this->assertSame('needs_review', $doc->fresh()->status);
    }

    public function test_corrections_endpoint_requires_permission(): void
    {
        $doc = $this->makeDocument();

        $this->actingAs($this->userWith(['document_upload.view', 'document_upload.update']))
            ->patchJson("/api/document-uploads/{$doc->public_id}", [
                'review_edits' => ['document_number' => 'INV-1'],
            ])
            ->assertForbidden();
    }

    public function test_corrections_endpoint_applies_edits_for_a_permitted_user(): void
    {
        $doc = $this->makeDocument();

        $user = $this->userWith([
            'document_upload.view',
            'document_upload.update',
            'document_upload.proposal.update',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/document-uploads/{$doc->public_id}", [
                'review_edits' => ['document_number' => 'INV-2024'],
            ])
            ->assertOk()
            ->assertJsonPath('corrections.applied', 1);

        $this->assertSame(
            'INV-2024',
            $doc->fresh()->extraction->structured_json['fields']['document_number']['value'],
        );
    }

    // ---------- Deterministic validation (Milestone 4) ----------

    public function test_a_due_date_before_the_document_date_is_flagged(): void
    {
        $doc = $this->makeDocument(['due_date' => '2026-07-01']);

        $structured = app(DocumentValidationService::class)
            ->revalidate($doc->extraction->structured_json);

        $this->assertSame('conflict', $structured['fields']['due_date']['state']);
    }

    public function test_a_subtotal_that_disagrees_with_the_lines_is_flagged_with_the_calculated_value(): void
    {
        $doc = $this->makeDocument([
            'totals' => ['subtotal' => 500, 'grand_total' => 500],
        ]);

        $structured = app(DocumentValidationService::class)
            ->revalidate($doc->extraction->structured_json);

        $subtotal = $structured['fields']['totals.subtotal'];

        $this->assertSame('conflict', $subtotal['state']);
        $this->assertSame('200', $subtotal['conflict_value']);
        // assertEquals, not assertSame: the value round-trips through JSON
        // storage, so 500.0 decodes as int 500. The point of the assertion is
        // that the document's figure survived, not its PHP type.
        $this->assertEquals(500, $subtotal['value'], 'The document figure must not be overwritten.');
    }

    public function test_paying_more_than_the_total_is_flagged(): void
    {
        $doc = $this->makeDocument([
            'totals' => ['subtotal' => 200, 'grand_total' => 200, 'paid_amount' => 500],
        ]);

        $structured = app(DocumentValidationService::class)
            ->revalidate($doc->extraction->structured_json);

        $this->assertSame('conflict', $structured['fields']['totals.paid_amount']['state']);
    }

    public function test_an_invalid_currency_code_is_flagged(): void
    {
        $doc = $this->makeDocument();

        $structured = $doc->extraction->structured_json;
        $structured['fields']['currency_code']['value'] = 'RUPEES';

        $structured = app(DocumentValidationService::class)->revalidate($structured);

        $this->assertSame('conflict', $structured['fields']['currency_code']['state']);
    }

    public function test_rounding_differences_within_tolerance_are_accepted(): void
    {
        $doc = $this->makeDocument([
            'totals' => ['subtotal' => 200, 'grand_total' => 200.02],
        ]);

        $structured = app(DocumentValidationService::class)
            ->revalidate($doc->extraction->structured_json);

        $this->assertNotSame('conflict', $structured['fields']['totals.grand_total']['state']);
    }

    // ---------- Readiness (Milestone 4) ----------

    public function test_a_clean_document_is_ready_and_names_its_target(): void
    {
        $doc = $this->makeDocument();
        $user = $this->userWith(['document_upload.view', 'document_upload.convert']);

        $readiness = app(DocumentReadinessService::class)->evaluate($doc, $user);

        $this->assertTrue($readiness['ready']);
        $this->assertSame([], $readiness['blockers']);
        $this->assertSame('purchase_bill', $readiness['conversion_target']);
    }

    public function test_blockers_are_actionable_sentences_not_field_keys(): void
    {
        $doc = $this->makeDocument(['party' => ['name' => null]]);
        $user = $this->userWith(['document_upload.view', 'document_upload.convert']);

        $readiness = app(DocumentReadinessService::class)->evaluate($doc, $user);

        $this->assertFalse($readiness['ready']);
        $this->assertContains('Add the supplier or customer.', $readiness['blockers']);

        foreach ($readiness['blockers'] as $blocker) {
            $this->assertStringNotContainsString('party.', $blocker, 'Blockers must not leak field keys.');
        }
    }

    public function test_a_non_convertible_type_is_not_ready(): void
    {
        $doc = $this->makeDocument(['document_type' => 'bank_statement']);
        $user = $this->userWith(['document_upload.view', 'document_upload.convert']);

        $readiness = app(DocumentReadinessService::class)->evaluate($doc, $user);

        $this->assertFalse($readiness['ready']);
        $this->assertNull($readiness['conversion_target']);
    }

    public function test_a_user_without_convert_permission_is_told_why(): void
    {
        $doc = $this->makeDocument();
        $user = $this->userWith(['document_upload.view']);

        $readiness = app(DocumentReadinessService::class)->evaluate($doc, $user);

        $this->assertFalse($readiness['ready']);
        $this->assertContains(
            'You do not have permission to create drafts from documents.',
            $readiness['blockers'],
        );
    }

    public function test_an_already_converted_document_cannot_be_converted_again(): void
    {
        $doc = $this->makeDocument([], 'converted');
        $user = $this->userWith(['document_upload.view', 'document_upload.convert']);

        $readiness = app(DocumentReadinessService::class)->evaluate($doc, $user);

        $this->assertFalse($readiness['ready']);
        $this->assertContains('A draft has already been created from this document.', $readiness['blockers']);
    }

    public function test_an_unscanned_document_is_not_ready(): void
    {
        $doc = DocumentUpload::create([
            'label' => 'Unscanned',
            'original_file_name' => 'x.pdf',
            'file_path' => 'documents/2026/x.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 10,
            'status' => 'uploaded',
            'document_type' => 'unknown',
        ]);

        $readiness = app(DocumentReadinessService::class)->evaluate($doc);

        $this->assertFalse($readiness['ready']);
        $this->assertContains('This document has not been scanned yet.', $readiness['blockers']);
    }

    public function test_readiness_is_exposed_on_the_extraction_endpoint(): void
    {
        $doc = $this->makeDocument();

        $user = $this->userWith([
            'document_upload.view',
            'document_upload.extract.view',
            'document_upload.convert',
        ]);

        $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/extraction")
            ->assertOk()
            ->assertJsonPath('readiness.ready', true)
            ->assertJsonPath('readiness.conversion_target', 'purchase_bill');
    }
}
