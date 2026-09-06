<?php

declare(strict_types=1);

namespace Tests\Feature\Documents;

use App\Models\DocumentEntityMatch;
use App\Models\DocumentExtraction;
use App\Models\DocumentNumbering;
use App\Models\DocumentUpload;
use App\Models\Permission;
use App\Models\Product;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\Documents\DocumentEntityMatcher;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\Pipeline\DocumentProcessingStage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Linking a line item to a product happens on the line, in one step.
 *
 * The reviewer picks an existing product or accepts the document's own
 * wording; the server links what already exists and only creates when nothing
 * does, so repeating a name never multiplies the catalogue.
 */
class DocumentLineProductLinkTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (array_merge(DocumentPermissionService::ALL, AiPermissionService::ALL) as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        DocumentNumbering::query()->create([
            'document_type' => 'product',
            'prefix' => 'PRD',
            'next_number' => 1,
            'type_of_account' => 'auto_numbering',
            'active' => true,
        ]);
    }

    private function userWith(array $permissions): User
    {
        $user = User::factory()->create();

        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }

        return $user->fresh();
    }

    private function document(string $type, array $lines): DocumentUpload
    {
        $doc = DocumentUpload::create([
            'label' => 'Doc',
            'original_file_name' => 'doc.pdf',
            'file_path' => 'documents/2026/doc.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1000,
            'status' => 'needs_review',
            'document_type' => $type,
        ]);

        DocumentExtraction::create([
            'document_upload_id' => $doc->id,
            'status' => 'completed',
            'stage' => DocumentProcessingStage::ReadyForReview->value,
            'schema_version' => '2.0',
            'attempt_number' => 1,
            'structured_json' => [],
            'normalized_json' => ['document_type' => $type, 'lines' => $lines],
        ]);

        return $doc->fresh();
    }

    private function match(DocumentUpload $doc): array
    {
        return app(DocumentEntityMatcher::class)->matchAll($doc, $doc->extraction->normalized_json);
    }

    public function test_a_receipts_lines_are_not_matched_to_products(): void
    {
        $doc = $this->document('expense_receipt', [
            ['description' => 'Bank charges', 'amount' => 12],
        ]);

        $this->match($doc);

        $this->assertSame(0, DocumentEntityMatch::query()
            ->where('document_upload_id', $doc->id)
            ->where('entity_type', 'product')
            ->count(), 'A cost line is not a catalogue item.');
    }

    public function test_an_invoice_line_gets_a_product_match_carrying_its_line_index(): void
    {
        $doc = $this->document('sales_invoice', [
            ['description' => 'Wheel alignment', 'amount' => 70],
        ]);

        $this->match($doc);

        $match = DocumentEntityMatch::query()->where('document_upload_id', $doc->id)->where('entity_type', 'product')->first();

        $this->assertNotNull($match);
        $this->assertSame(0, $match->options['extra']['line_index']);
    }

    public function test_rerunning_matching_drops_rows_for_lines_that_no_longer_exist(): void
    {
        $doc = $this->document('sales_invoice', [
            ['description' => 'Wheel alignment', 'amount' => 70],
            ['description' => 'Oil change', 'amount' => 40],
        ]);

        $this->match($doc);
        $this->assertSame(2, DocumentEntityMatch::query()->where('document_upload_id', $doc->id)->where('entity_type', 'product')->count());

        $doc->extraction->update(['normalized_json' => [
            'document_type' => 'sales_invoice',
            'lines' => [['description' => 'Wheel alignment', 'amount' => 70]],
        ]]);

        $this->match($doc->fresh());

        $remaining = DocumentEntityMatch::query()
            ->where('document_upload_id', $doc->id)
            ->where('entity_type', 'product')
            ->pluck('extracted_name')
            ->all();

        $this->assertSame(['Wheel alignment'], $remaining, 'A deleted line must not keep asking to be linked.');
    }

    public function test_linking_by_name_reuses_an_existing_product_instead_of_creating_a_second(): void
    {
        $product = Product::create(['name' => 'Wheel Alignment', 'product_type' => 'service']);

        $doc = $this->document('sales_invoice', [['description' => 'wheel alignment', 'amount' => 70]]);
        $this->match($doc);
        $match = DocumentEntityMatch::query()->where('document_upload_id', $doc->id)->where('entity_type', 'product')->firstOrFail();

        $user = $this->userWith(['document_upload.view', 'document_upload.entity_match', 'document_upload.create_fk']);

        $response = $this->actingAs($user)
            ->postJson("/api/document-uploads/matches/{$match->id}/link", ['name' => 'wheel alignment'])
            ->assertOk();

        $this->assertFalse($response->json('created'));
        $this->assertSame($product->id, $match->fresh()->matched_id);
        $this->assertSame(1, Product::query()->count());
    }

    public function test_linking_an_unknown_name_creates_a_service_not_tracked_stock(): void
    {
        $doc = $this->document('sales_invoice', [['description' => 'Brake pad replacement', 'amount' => 80]]);
        $this->match($doc);
        $match = DocumentEntityMatch::query()->where('document_upload_id', $doc->id)->where('entity_type', 'product')->firstOrFail();

        $user = $this->userWith(['document_upload.view', 'document_upload.entity_match', 'document_upload.create_fk']);

        $this->actingAs($user)
            ->postJson("/api/document-uploads/matches/{$match->id}/link", ['name' => 'Brake pad replacement'])
            ->assertOk()
            ->assertJsonPath('created', true);

        $product = Product::query()->firstOrFail();

        $this->assertSame('Brake pad replacement', $product->name);
        $this->assertSame('service', $product->product_type);
        $this->assertFalse((bool) $product->track_inventory, 'A product invented from a line has no stock behind it.');
        $this->assertSame('created', $match->fresh()->match_status);
    }

    public function test_creating_a_record_requires_the_create_permission(): void
    {
        $doc = $this->document('sales_invoice', [['description' => 'Brake pad replacement', 'amount' => 80]]);
        $this->match($doc);
        $match = DocumentEntityMatch::query()->where('document_upload_id', $doc->id)->where('entity_type', 'product')->firstOrFail();

        $user = $this->userWith(['document_upload.view', 'document_upload.entity_match']);

        $this->actingAs($user)
            ->postJson("/api/document-uploads/matches/{$match->id}/link", ['name' => 'Brake pad replacement'])
            ->assertForbidden();

        $this->assertSame(0, Product::query()->count());
    }

    public function test_the_picker_searches_products_without_catalogue_permission(): void
    {
        Product::create(['name' => 'Business Consulting Service', 'product_type' => 'service']);
        Product::create(['name' => 'Office Work Desk', 'product_type' => 'simple']);

        $doc = $this->document('sales_invoice', [['description' => 'Consulting', 'amount' => 80]]);
        $user = $this->userWith(['document_upload.view', 'document_upload.entity_match']);

        $results = $this->actingAs($user)
            ->getJson("/api/document-uploads/{$doc->public_id}/entity-search?type=product&q=consult")
            ->assertOk()
            ->json('results');

        $this->assertCount(1, $results);
        $this->assertSame('Business Consulting Service', $results[0]['name']);
    }
}
