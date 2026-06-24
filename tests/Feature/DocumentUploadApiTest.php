<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Currency;
use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Models\Permission;
use App\Models\User;
use App\Services\Documents\DocumentPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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

    public function test_unauthorized_user_cannot_upload(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/api/document-uploads', [])
            ->assertStatus(403);
    }

    public function test_user_can_upload_document_with_label(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.create']);

        $file = UploadedFile::fake()->create('bill.pdf', 200, 'application/pdf');

        $resp = $this->actingAs($user)
            ->post('/api/document-uploads', [
                'label' => 'Acme bill',
                'document_type' => 'purchase_bill',
                'file' => $file,
            ]);

        $resp->assertOk()
            ->assertJson(['ok' => true])
            ->assertJsonMissingPath('document.file_path')
            ->assertJsonMissingPath('document.file_hash')
            ->assertJsonMissingPath('document.uploaded_by');

        $this->assertDatabaseHas('document_uploads', [
            'label' => 'Acme bill',
            'status' => 'uploaded',
            'document_type' => 'purchase_bill',
        ]);
    }

    public function test_user_can_upload_supported_docx_document(): void
    {
        $user = $this->userWith(['document_upload.create']);
        $file = UploadedFile::fake()->create(
            'supplier-bill.docx',
            50,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        $this->actingAs($user)
            ->post('/api/document-uploads', [
                'label' => 'Supplier bill DOCX',
                'file' => $file,
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    public function test_upload_rejects_invalid_file_type(): void
    {
        $user = $this->userWith(['document_upload.create']);
        $file = UploadedFile::fake()->create('bad.exe', 10, 'application/octet-stream');

        $this->actingAs($user)
            ->post('/api/document-uploads', ['label' => 'Bad', 'file' => $file])
            ->assertStatus(422);
    }

    public function test_list_returns_documents_without_storage_internals(): void
    {
        $user = $this->userWith(['document_upload.view']);
        DocumentUpload::create([
            'label' => 'Test',
            'original_file_name' => 'a.pdf',
            'file_path' => 'documents/a.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'file_hash' => hash('sha256', 'demo'),
            'status' => 'uploaded',
            'document_type' => 'unknown',
        ]);

        $this->actingAs($user)
            ->getJson('/api/document-uploads')
            ->assertOk()
            ->assertJsonStructure(['data', 'total'])
            ->assertJsonMissingPath('data.0.file_path')
            ->assertJsonMissingPath('data.0.file_hash');
    }

    public function test_preview_uses_private_no_store_headers(): void
    {
        $user = $this->userWith(['document_upload.view']);
        Storage::disk('local')->put('documents/a.pdf', 'fake-pdf');

        $doc = DocumentUpload::create([
            'label' => 'Preview',
            'original_file_name' => 'a.pdf',
            'file_path' => 'documents/a.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 8,
            'status' => 'uploaded',
            'document_type' => 'unknown',
        ]);

        $this->actingAs($user)
            ->get("/api/document-uploads/{$doc->id}/preview")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Cache-Control', 'private, no-store, max-age=0');
    }

    public function test_extraction_response_hides_raw_ai_text(): void
    {
        $user = $this->userWith(['document_upload.extract.view']);
        $doc = DocumentUpload::create([
            'label' => 'X',
            'original_file_name' => 'a.pdf',
            'file_path' => 'documents/a.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1,
            'status' => 'extracted',
        ]);

        DocumentExtraction::create([
            'document_upload_id' => $doc->id,
            'status' => 'completed',
            'raw_text' => 'sensitive provider output',
            'extracted_json' => ['raw' => 'payload'],
            'normalized_json' => ['document_type' => 'expense_receipt'],
        ]);

        $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->id}/extraction")
            ->assertOk()
            ->assertJsonMissingPath('extraction.raw_text')
            ->assertJsonMissingPath('extraction.extracted_json')
            ->assertJsonMissingPath('document.file_path')
            ->assertJsonMissingPath('document.file_hash');
    }

    public function test_scan_endpoint_requires_permission(): void
    {
        $user = $this->userWith(['document_upload.view']);
        $doc = DocumentUpload::create([
            'label' => 'x', 'original_file_name' => 'a.pdf', 'file_path' => 'a.pdf',
            'mime_type' => 'application/pdf', 'file_size' => 1, 'status' => 'uploaded',
        ]);
        $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->id}/scan-ai")
            ->assertStatus(403);
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
            ->postJson("/api/document-uploads/{$doc->id}/proposals", [
                'transaction_type' => 'expense',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $proposalId = $resp->json('proposal.id');
        $this->assertNotEmpty($proposalId);

        $convertResp = $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->id}/proposals/{$proposalId}/convert")
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('transaction_type', 'expense');

        $recordId = $convertResp->json('record_id');
        $this->assertDatabaseHas('expenses', [
            'id' => $recordId,
            'approved' => false,
            'status' => 'draft',
        ]);

        $this->assertDatabaseHas('document_links', [
            'document_upload_id' => $doc->id,
            'linkable_id' => $recordId,
        ]);

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
            ->postJson("/api/document-uploads/{$doc->id}/proposals", [
                'transaction_type' => 'bogus_type',
            ])->assertStatus(422);

        foreach (['purchase_bill', 'invoice', 'expense', 'customer_payment', 'supplier_payment', 'credit_note', 'debit_note', 'purchase_order', 'sales_order', 'quotation'] as $type) {
            $this->actingAs($user)
                ->postJson("/api/document-uploads/{$doc->id}/proposals", [
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
