<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\Documents\DocumentExtractionNormalizerV2;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\Pipeline\DocumentErrorCode;
use App\Services\Documents\Pipeline\DocumentProcessingStage;
use App\Services\Documents\Schema\DocumentSchemaRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Milestone 3: the review workspace's API contract.
 */
class DocumentReviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (array_merge(DocumentPermissionService::ALL, AiPermissionService::ALL) as $p) {
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

    private function documentWithExtraction(array $extractionOverrides = []): DocumentUpload
    {
        $doc = DocumentUpload::create([
            'label' => 'ABC bill',
            'original_file_name' => 'bill.pdf',
            'file_path' => 'documents/2026/bill.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1000,
            'status' => 'needs_review',
            'document_type' => 'purchase_bill',
        ]);

        $v2 = app(DocumentExtractionNormalizerV2::class)->normalize([
            'document_type' => 'purchase_bill',
            'document_number' => 'INV-1042',
            'document_date' => '2026-08-01',
            'party' => ['name' => 'ABC Trading'],
            'lines' => [['description' => 'Widget', 'quantity' => 2, 'rate' => 100, 'amount' => 200]],
            'totals' => ['subtotal' => 200, 'grand_total' => 200],
            'field_confidence' => ['document_number' => 0.93],
        ]);

        DocumentExtraction::create(array_merge([
            'document_upload_id' => $doc->id,
            'status' => 'completed',
            'stage' => DocumentProcessingStage::ReadyForReview->value,
            'schema_version' => '2.0',
            'attempt_number' => 1,
            'duration_ms' => 4200,
            'review_issue_count' => $v2->reviewIssueCount(),
            'structured_json' => $v2->toArray(includeDebug: true),
            'normalized_json' => ['document_type' => 'purchase_bill'],
        ], $extractionOverrides));

        return $doc->fresh();
    }

    public function test_review_payload_is_returned_with_field_level_states(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.extract.view']);
        $doc = $this->documentWithExtraction();

        $response = $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/extraction")
            ->assertOk();

        $review = $response->json('extraction.review');

        $this->assertSame('2.0', $review['schema_version']);
        $this->assertSame('purchase_bill', $review['conversion_target']);
        $this->assertTrue($review['is_convertible']);
        $this->assertSame('INV-1042', $review['fields']['document_number']['value']);
        $this->assertSame('extracted', $review['fields']['document_number']['origin']);
        $this->assertSame('From document', $review['fields']['document_number']['origin_label']);
    }

    public function test_stage_and_attempt_metadata_are_exposed(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.extract.view']);
        $doc = $this->documentWithExtraction();

        $response = $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/extraction")
            ->assertOk();

        $this->assertSame('ready_for_review', $response->json('extraction.stage.key'));
        $this->assertSame('Preparing your review', $response->json('extraction.stage.label'));
        $this->assertTrue($response->json('extraction.stage.is_terminal'));
        $this->assertSame(1, $response->json('extraction.attempt.number'));
        $this->assertSame(4200, $response->json('extraction.attempt.duration_ms'));
    }

    /**
     * The product shows a state, not a number. A raw percentage invites the user
     * to reason about a value they have no way to calibrate.
     */
    public function test_raw_confidence_is_hidden_from_ordinary_users(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.extract.view']);
        $doc = $this->documentWithExtraction();

        $response = $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/extraction")
            ->assertOk();

        $field = $response->json('extraction.review.fields.document_number');

        $this->assertArrayNotHasKey('confidence', $field);
        $this->assertNull($response->json('extraction.review.overall_confidence'));

        // The human-readable state is still present.
        $this->assertArrayHasKey('state_label', $field);
    }

    public function test_debug_users_may_see_raw_confidence(): void
    {
        $user = $this->userWith([
            'document_upload.view',
            'document_upload.extract.view',
            'ai.debug.view',
        ]);

        $doc = $this->documentWithExtraction();

        $response = $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/extraction")
            ->assertOk();

        $this->assertSame(
            0.93,
            $response->json('extraction.review.fields.document_number.confidence'),
        );
    }

    public function test_failed_extraction_returns_an_actionable_error_not_provider_detail(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.extract.view']);

        $doc = $this->documentWithExtraction([
            'status' => 'failed',
            'stage' => DocumentProcessingStage::Failed->value,
            'error_code' => DocumentErrorCode::AiTimeout->value,
            'error_message' => DocumentErrorCode::AiTimeout->message(),
            'structured_json' => null,
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/extraction")
            ->assertOk();

        $error = $response->json('extraction.error');

        $this->assertSame('DOCUMENT_AI_TIMEOUT', $error['code']);
        $this->assertContains('retry', $error['actions']);
        $this->assertTrue($error['transient']);

        foreach (['http', 'gemini', 'openai', 'json', 'exception'] as $leak) {
            $this->assertStringNotContainsString($leak, strtolower($error['message']));
        }
    }

    public function test_review_page_requires_extraction_view_permission(): void
    {
        $doc = $this->documentWithExtraction();

        $this->actingAs($this->userWith(['document_upload.view']))
            ->get("/documents/{$doc->public_id}/review")
            ->assertForbidden();
    }

    public function test_document_type_schema_drives_convertibility_in_the_payload(): void
    {
        $registry = new DocumentSchemaRegistry();

        // A bank statement is readable but must not offer draft creation.
        $this->assertFalse($registry->get('bank_statement')->isConvertible());
        $this->assertTrue($registry->get('purchase_bill')->isConvertible());
    }
}
