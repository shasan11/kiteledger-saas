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
use Illuminate\Support\Facades\Storage;

class DocumentExtractionController extends Controller
{
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

        if (!in_array($doc->status, ['uploaded', 'failed', 'needs_review', 'extracted'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Document cannot be scanned in current status: ' . $doc->status,
                'code' => 'DOCUMENT_STATUS_INVALID',
            ], 422);
        }

        if (! Storage::disk(config('documents.disk', 'local'))->exists($doc->file_path)) {
            return response()->json([
                'ok' => false,
                'message' => 'Document file is missing.',
                'code' => 'DOCUMENT_FILE_MISSING',
            ], 422);
        }

        $extraction = DocumentExtraction::query()->create([
            'document_upload_id' => $doc->id,
            'status' => 'queued',
            'provider' => null,
            'model' => null,
        ]);

        $doc->update(['status' => 'queued']);
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
