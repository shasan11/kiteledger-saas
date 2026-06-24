<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Currency;
use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Models\Permission;
use App\Models\User;
use App\Jobs\Documents\ProcessDocumentAiExtractionJob;
use App\Services\Documents\DocumentPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class DocumentUploadApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (DocumentPermissionService::ALL as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Storage::fake('local');
    }

    private function userWith(array $permissions = []): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $p) {
            $user->givePermissionTo($p);
        }
        return $user->fresh();
    }

    private function makeDocument(array $overrides = []): DocumentUpload
    {
        return DocumentUpload::create(array_merge([
            'label' => 'Test',
            'original_file_name' => 'a.pdf',
            'file_path' => 'documents/2026/a.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'uploaded',
            'document_type' => 'unknown',
        ], $overrides));
    }

    public function test_unauthorized_user_cannot_upload(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/api/document-uploads', [])
            ->assertStatus(403);
    }

    public function test_user_can_upload_pdf_with_safe_response(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.create']);

        $file = UploadedFile::fake()->create('bill.pdf', 200, 'application/pdf');

        $resp = $this->actingAs($user)
            ->post('/api/document-uploads', [
                'label' => 'Acme bill',
                'document_type' => 'purchase_bill',
                'file' => $file,
            ]);

        $resp->assertOk()->assertJson(['ok' => true]);
        $resp->assertJsonPath('document.original_name', 'bill.pdf');
        $resp->assertJsonMissingPath('document.id');
        $resp->assertJsonMissingPath('document.file_path');
        $resp->assertJsonMissingPath('document.file_hash');
        $resp->assertJsonMissingPath('document.uploaded_by');
        $resp->assertJsonMissingPath('document.branch_id');
        $resp->assertJsonMissingPath('document.fiscal_year_id');
        $this->assertNotEmpty($resp->json('document.public_id'));

        $this->assertDatabaseHas('document_uploads', [
            'label' => 'Acme bill',
            'status' => 'uploaded',
            'document_type' => 'purchase_bill',
        ]);
    }

    public function test_user_can_upload_supported_docx_and_images(): void
    {
        $user = $this->userWith(['document_upload.create']);

        foreach ([
            ['bill.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            ['bill.jpg', 'image/jpeg'],
            ['bill.png', 'image/png'],
            ['bill.webp', 'image/webp'],
        ] as [$name, $mime]) {
            $this->actingAs($user)
                ->post('/api/document-uploads', [
                    'label' => $name,
                    'file' => UploadedFile::fake()->create($name, 10, $mime),
                ])
                ->assertOk()
                ->assertJsonMissingPath('document.file_path');
        }
    }

    public function test_upload_rejects_invalid_file_type(): void
    {
        $user = $this->userWith(['document_upload.create']);
        $file = UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream');

        $this->actingAs($user)
            ->post('/api/document-uploads', ['label' => 'Bad', 'file' => $file])
            ->assertStatus(422);
    }

    public function test_upload_rejects_oversized_file(): void
    {
        $user = $this->userWith(['document_upload.create']);
        $file = UploadedFile::fake()->create('huge.pdf', 11000, 'application/pdf');

        $this->actingAs($user)
            ->post('/api/document-uploads', ['label' => 'Huge', 'file' => $file])
            ->assertStatus(422);
    }

    public function test_list_returns_documents(): void
    {
        $user = $this->userWith(['document_upload.view']);
        $doc = $this->makeDocument([
            'file_path' => 'documents/a.pdf',
            'file_hash' => 'secret-hash',
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->getJson('/api/document-uploads')
            ->assertOk()
            ->assertJsonPath('data.0.public_id', $doc->public_id)
            ->assertJsonMissingPath('data.0.id')
            ->assertJsonMissingPath('data.0.file_path')
            ->assertJsonMissingPath('data.0.file_hash')
            ->assertJsonMissingPath('data.0.uploaded_by')
            ->assertJsonMissingPath('data.0.branch_id')
            ->assertJsonMissingPath('data.0.fiscal_year_id');
    }

    public function test_scan_endpoint_requires_permission(): void
    {
        $user = $this->userWith(['document_upload.view']);
        $doc = $this->makeDocument(['file_path' => 'a.pdf']);

        $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/scan-ai")
            ->assertStatus(403);
    }

    public function test_preview_requires_auth_and_uses_public_id_with_secure_headers(): void
    {
        $user = $this->userWith(['document_upload.view']);
        Storage::disk('local')->put('documents/2026/a.pdf', '%PDF-1.4');
        $doc = $this->makeDocument();

        $this->get("/api/document-uploads/{$doc->public_id}/preview")
            ->assertRedirect();

        $response = $this->actingAs($user)
            ->get("/api/document-uploads/{$doc->public_id}/preview")
            ->assertOk();

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Pragma', 'no-cache');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_scan_returns_queued_extraction_resource_without_sensitive_fields(): void
    {
        Queue::fake();

        $user = $this->userWith(['document_upload.scan_ai']);
        Storage::disk('local')->put('documents/2026/a.pdf', '%PDF-1.4');
        $doc = $this->makeDocument();

        $response = $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/scan-ai")
            ->assertOk()
            ->assertJsonPath('extraction.status', 'queued')
            ->assertJsonMissingPath('extraction.id')
            ->assertJsonMissingPath('extraction.document_upload_id')
            ->assertJsonMissingPath('extraction.raw_text')
            ->assertJsonMissingPath('extraction.extracted_json')
            ->assertJsonMissingPath('document.id')
            ->assertJsonMissingPath('document.file_path');

        $this->assertNotEmpty($response->json('extraction.public_id'));

        Queue::assertPushed(ProcessDocumentAiExtractionJob::class);
    }

    public function test_proposal_create_and_convert_to_draft_expense(): void
    {
        $user = $this->userWith([
            'document_upload.view', 'document_upload.proposal.create',
            'document_upload.proposal.update', 'document_upload.convert',
        ]);

        $doc = DocumentUpload::create([
            'label' => 'Office Supplies', 'original_file_name' => 'r.pdf', 'file_path' => 'r.pdf',
            'mime_type' => 'application/pdf', 'file_size' => 1, 'status' => 'needs_review',
        ]);

        // simulate completed extraction with line + totals
        DocumentExtraction::create([
            'document_upload_id' => $doc->id,
            'status' => 'completed',
            'normalized_json' => [
                'document_type' => 'expense_receipt',
                'document_number' => 'R-1',
                'document_date' => '2026-05-28',
                'currency_code' => 'USD',
                'party' => ['role' => 'supplier', 'name' => 'Office Co'],
                'lines' => [[
                    'description' => 'Pens',
                    'quantity' => 10, 'rate' => 5, 'amount' => 50,
                    'tax_amount' => 0, 'discount' => 0,
                ]],
                'totals' => ['grand_total' => 50, 'subtotal' => 50, 'tax_total' => 0, 'discount_total' => 0, 'shipping' => 0],
            ],
        ]);

        $resp = $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/proposals", [
                'transaction_type' => 'expense',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $proposalId = $resp->json('proposal.id');
        $this->assertNotEmpty($proposalId);

        // No contact required for expense — should convert directly
        $convertResp = $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/proposals/{$proposalId}/convert")
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('transaction_type', 'expense');

        // Draft expense exists, approved=false
        $recordId = $convertResp->json('record_id');
        $this->assertDatabaseHas('expenses', [
            'id' => $recordId,
            'approved' => false,
            'status' => 'draft',
        ]);

        // Document link created
        $this->assertDatabaseHas('document_links', [
            'document_upload_id' => $doc->id,
            'linkable_id' => $recordId,
        ]);

        // Document status updated to converted
        $this->assertSame('converted', $doc->fresh()->status);
    }

    public function test_supported_transaction_types_are_accepted(): void
    {
        $user = $this->userWith([
            'document_upload.proposal.create', 'document_upload.proposal.update',
        ]);
        $doc = DocumentUpload::create([
            'label' => 'X', 'original_file_name' => 'r.pdf', 'file_path' => 'r.pdf',
            'mime_type' => 'application/pdf', 'file_size' => 1, 'status' => 'needs_review',
        ]);

        $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/proposals", [
                'transaction_type' => 'bogus_type',
            ])->assertStatus(422);

        foreach (['purchase_bill', 'invoice', 'expense', 'customer_payment', 'supplier_payment', 'credit_note', 'debit_note', 'purchase_order', 'sales_order', 'quotation'] as $type) {
            $this->actingAs($user)
                ->postJson("/api/document-uploads/{$doc->public_id}/proposals", [
                    'transaction_type' => $type,
                ])->assertOk();
        }
    }

    public function test_permissions_summary_listed(): void
    {
        $svc = app(DocumentPermissionService::class);
        $user = $this->userWith(['document_upload.view']);
        $summary = $svc->summary($user);
        $this->assertTrue($summary['document_upload.view']);
        $this->assertFalse($summary['document_upload.delete']);
    }
}
