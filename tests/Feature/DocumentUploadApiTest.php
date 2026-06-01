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

        $resp->assertOk()->assertJson(['ok' => true]);
        $this->assertDatabaseHas('document_uploads', [
            'label' => 'Acme bill',
            'status' => 'uploaded',
            'document_type' => 'purchase_bill',
        ]);
    }

    public function test_upload_rejects_invalid_file_type(): void
    {
        $user = $this->userWith(['document_upload.create']);
        $file = UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream');

        $this->actingAs($user)
            ->post('/api/document-uploads', ['label' => 'Bad', 'file' => $file])
            ->assertStatus(422);
    }

    public function test_list_returns_documents(): void
    {
        $user = $this->userWith(['document_upload.view']);
        DocumentUpload::create([
            'label' => 'Test',
            'original_file_name' => 'a.pdf',
            'file_path' => 'documents/a.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'uploaded',
            'document_type' => 'unknown',
        ]);
        $this->actingAs($user)
            ->getJson('/api/document-uploads')
            ->assertOk()
            ->assertJsonStructure(['data', 'total']);
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
            ->postJson("/api/document-uploads/{$doc->id}/proposals", [
                'transaction_type' => 'expense',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $proposalId = $resp->json('proposal.id');
        $this->assertNotEmpty($proposalId);

        // No contact required for expense — should convert directly
        $convertResp = $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->id}/proposals/{$proposalId}/convert")
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
