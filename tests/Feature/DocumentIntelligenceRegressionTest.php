<?php

namespace Tests\Feature;

use App\Jobs\Documents\ProcessDocumentAiExtractionJob;
use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Models\Permission;
use App\Models\User;
use App\Services\Documents\DocumentPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Regression cover for the Document Intelligence defects fixed on
 * feature/fix-document-intelligence-copilot.
 */
class DocumentIntelligenceRegressionTest extends TestCase
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

    /**
     * extraction() previously used latestOfMany(), which aggregates MAX(id).
     * Because ids are UUIDs that comparison is lexicographic, so a stale
     * attempt could win. Seed ids that invert the chronological order to make
     * the old behaviour fail.
     */
    public function test_latest_extraction_is_resolved_by_time_not_uuid_ordering(): void
    {
        $doc = $this->makeDocument();

        $older = DocumentExtraction::create([
            'id' => 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            'document_upload_id' => $doc->id,
            'status' => 'completed',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $newer = DocumentExtraction::create([
            'id' => '00000000-0000-4000-8000-000000000001',
            'document_upload_id' => $doc->id,
            'status' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resolved = $doc->fresh()->extraction;

        $this->assertSame($newer->id, $resolved->id, 'The newest attempt must win.');
        $this->assertSame('queued', $resolved->status);
        $this->assertNotSame($older->id, $resolved->id);
    }

    public function test_second_scan_is_rejected_while_one_is_already_running(): void
    {
        Queue::fake();

        $user = $this->userWith([
            'document_upload.view',
            'document_upload.scan_ai',
            'document_upload.extract.view',
        ]);

        $doc = $this->makeDocument();
        Storage::disk('local')->put($doc->file_path, 'pdf-bytes');

        $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/scan-ai")
            ->assertOk()
            ->assertJson(['ok' => true]);

        // Document is now 'queued' with a live attempt — a second request must
        // not create another extraction or dispatch another job.
        $this->actingAs($user)
            ->postJson("/api/document-uploads/{$doc->public_id}/scan-ai")
            ->assertStatus(409);

        $this->assertSame(1, DocumentExtraction::where('document_upload_id', $doc->id)->count());
        Queue::assertPushed(ProcessDocumentAiExtractionJob::class, 1);
    }

    public function test_listing_applies_date_range_filters(): void
    {
        $user = $this->userWith(['document_upload.view']);

        $this->makeDocument(['label' => 'old'])->forceFill([
            'created_at' => now()->subDays(10),
        ])->save();

        $this->makeDocument(['label' => 'recent'])->forceFill([
            'created_at' => now()->subDay(),
        ])->save();

        $response = $this->actingAs($user)
            ->getJson('/api/document-uploads?date_from='.now()->subDays(3)->toDateString())
            ->assertOk();

        $labels = collect($response->json('data'))->pluck('label')->all();

        $this->assertContains('recent', $labels);
        $this->assertNotContains('old', $labels, 'date_from must exclude older documents.');
    }

    public function test_summary_counts_cover_whole_dataset_not_just_current_page(): void
    {
        $user = $this->userWith(['document_upload.view']);

        foreach (['uploaded', 'uploaded', 'processing', 'needs_review', 'converted', 'failed'] as $status) {
            $this->makeDocument(['status' => $status]);
        }

        // One row per page — the summary must still see all six documents.
        $response = $this->actingAs($user)
            ->getJson('/api/document-uploads?per_page=1')
            ->assertOk();

        $summary = $response->json('summary');

        $this->assertSame(2, $summary['uploaded']);
        $this->assertSame(1, $summary['processing']);
        $this->assertSame(1, $summary['needs_review']);
        $this->assertSame(1, $summary['converted']);
        $this->assertSame(1, $summary['failed']);
        $this->assertSame(6, $summary['total']);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_summary_endpoint_is_available_and_not_shadowed_by_wildcard_route(): void
    {
        $user = $this->userWith(['document_upload.view']);

        $this->makeDocument(['status' => 'converted']);

        $this->actingAs($user)
            ->getJson('/api/document-uploads/summary')
            ->assertOk()
            ->assertJson(['ok' => true])
            ->assertJsonPath('summary.converted', 1);
    }

    public function test_upload_size_limit_follows_configuration(): void
    {
        config(['documents.max_upload_mb' => 2]);

        $user = $this->userWith(['document_upload.view', 'document_upload.create']);

        // 3 MB against a 2 MB ceiling.
        $tooBig = UploadedFile::fake()->create('big.pdf', 3 * 1024, 'application/pdf');

        $this->actingAs($user)
            ->postJson('/api/document-uploads', [
                'label' => 'Too big',
                'file' => $tooBig,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');

        // Same file is accepted once the configured ceiling is raised, proving
        // the limit is not the old hardcoded 10 MB.
        config(['documents.max_upload_mb' => 8]);

        $this->actingAs($user)
            ->post('/api/document-uploads', [
                'label' => 'Now fine',
                'file' => UploadedFile::fake()->create('ok.pdf', 3 * 1024, 'application/pdf'),
            ])
            ->assertOk();
    }

    public function test_upload_is_rejected_before_storing_when_branch_is_not_accessible(): void
    {
        $user = $this->userWith(['document_upload.view', 'document_upload.create']);

        $this->actingAs($user)
            ->postJson('/api/document-uploads', [
                'label' => 'Foreign branch',
                'branch_id' => (string) \Illuminate\Support\Str::uuid(),
                'file' => UploadedFile::fake()->create('bill.pdf', 50, 'application/pdf'),
            ])
            ->assertStatus(403);

        // Nothing may be written to disk for a rejected upload.
        $this->assertEmpty(Storage::disk('local')->allFiles('documents'));
        $this->assertSame(0, DocumentUpload::count());
    }
}
