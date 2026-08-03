<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentExtractionResource;
use App\Http\Resources\DocumentUploadResource;
use App\Jobs\Documents\ProcessDocumentAiExtractionJob;
use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentPermissionService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentExtractionController extends Controller
{
    /** Statuses a document may be (re)scanned from. */
    private const SCANNABLE_STATUSES = ['uploaded', 'failed', 'needs_review', 'extracted'];

    public function __construct(
        protected DocumentPermissionService $perms,
        protected DocumentAuditService $audit,
        protected BranchScopeService $branchScope,
    ) {}

    public function scan(Request $request, string $publicId)
    {
        if (! config('documents.ai_scan_enabled', true)) {
            return response()->json([
                'ok' => false,
                'message' => 'AI document scanning is disabled.',
                'code' => 'AI_DOCUMENT_SCAN_DISABLED',
            ], 403);
        }

        $doc = DocumentUpload::query()->where('public_id', $publicId)->firstOrFail();
        $this->authorize('scanAi', $doc);
        $this->assertDocumentAccess($request, $doc);

        if (! Storage::disk(config('documents.disk', 'local'))->exists($doc->file_path)) {
            return response()->json([
                'ok' => false,
                'message' => 'Document file is missing.',
                'code' => 'DOCUMENT_FILE_MISSING',
            ], 422);
        }

        // The status check and the extraction insert have to happen under the
        // same row lock. Without it two concurrent scans (double click, two
        // tabs, retried request) both pass the whitelist and both enqueue a job.
        $extraction = DB::transaction(function () use ($doc) {
            $locked = DocumentUpload::query()->whereKey($doc->id)->lockForUpdate()->first();

            if (! $locked || ! in_array($locked->status, self::SCANNABLE_STATUSES, true)) {
                return $locked?->status ?? 'missing';
            }

            $hasActiveAttempt = DocumentExtraction::query()
                ->where('document_upload_id', $locked->id)
                ->whereIn('status', ['queued', 'processing'])
                ->exists();

            if ($hasActiveAttempt) {
                return 'in_progress';
            }

            $created = DocumentExtraction::query()->create([
                'document_upload_id' => $locked->id,
                'status' => 'queued',
                'provider' => null,
                'model' => null,
            ]);

            $locked->update(['status' => 'queued']);

            return $created;
        });

        if (! $extraction instanceof DocumentExtraction) {
            return response()->json([
                'ok' => false,
                'message' => $extraction === 'in_progress'
                    ? 'A scan is already running for this document.'
                    : 'Document cannot be scanned in current status: '.$extraction,
                'code' => $extraction === 'in_progress' ? 'DOCUMENT_SCAN_IN_PROGRESS' : 'DOCUMENT_STATUS_INVALID',
            ], 409);
        }

        $this->audit->log('scan.queued', [
            'document_upload_id' => $doc->id,
            'document_extraction_id' => $extraction->id,
        ]);

        ProcessDocumentAiExtractionJob::dispatch($doc->id, $extraction->id);

        return response()->json([
            'ok' => true,
            'message' => 'Document scan queued.',
            'document' => new DocumentUploadResource($doc->fresh(['extraction'])),
            'extraction' => new DocumentExtractionResource($extraction->load('documentUpload')),
        ]);
    }

    public function show(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.extract.view');
        $doc = DocumentUpload::with(['extraction', 'entityMatches', 'proposals'])
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->authorize('view', $doc);
        $this->assertDocumentAccess($request, $doc);

        return response()->json([
            'ok' => true,
            'document' => new DocumentUploadResource($doc),
            'extraction' => $doc->extraction ? new DocumentExtractionResource($doc->extraction->load('documentUpload')) : null,
            'matches' => $doc->entityMatches,
            'proposals' => $doc->proposals,
        ]);
    }

    private function assertDocumentAccess(Request $request, DocumentUpload $doc): void
    {
        if ($doc->branch_id) {
            $this->branchScope->assertCanAccessBranch($request->user(), (string) $doc->branch_id);
            $selected = $this->branchScope->selectedBranchId($request, $request->user());
            abort_if($selected && (string) $selected !== (string) $doc->branch_id, 403);
        }
    }
}
