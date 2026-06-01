<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Jobs\Documents\ScanDocumentWithAiJob;
use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAiExtractionService;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentEntityMatcher;
use App\Services\Documents\DocumentPermissionService;
use Illuminate\Http\Request;

class DocumentExtractionController extends Controller
{
    public function __construct(
        protected DocumentPermissionService $perms,
        protected DocumentAuditService $audit,
    ) {}

    public function scan(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.scan_ai');
        $doc = DocumentUpload::findOrFail($id);

        if (!in_array($doc->status, ['uploaded', 'failed', 'needs_review', 'extracted'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Document cannot be scanned in current status: ' . $doc->status,
                'code' => 'DOCUMENT_STATUS_INVALID',
            ], 422);
        }

        // Inline vs queued: if queue worker is configured use queue, else run sync (helpful for tests).
        $sync = $request->boolean('sync') || config('queue.default') === 'sync';

        $doc->update(['status' => 'processing']);
        $this->audit->log('scan.dispatched', ['document_upload_id' => $doc->id, 'sync' => $sync]);

        if ($sync) {
            try {
                $extractor = app(DocumentAiExtractionService::class);
                $matcher = app(DocumentEntityMatcher::class);
                $extraction = $extractor->run($doc);
                if ($extraction->status === 'completed' && is_array($extraction->normalized_json)) {
                    $matcher->matchAll($doc, $extraction->normalized_json);
                    $doc->update(['status' => 'needs_review']);
                }
            } catch (\Throwable $e) {
                return response()->json([
                    'ok' => false,
                    'message' => $e->getMessage(),
                    'code' => method_exists($e, 'getErrorCode') ? $e->getErrorCode() : 'DOCUMENT_EXTRACTION_FAILED',
                ], 422);
            }
        } else {
            ScanDocumentWithAiJob::dispatch($doc->id);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Document scan started.',
            'document_id' => $doc->id,
            'status' => $doc->fresh()->status,
        ]);
    }

    public function show(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.extract.view');
        $doc = DocumentUpload::with(['extraction', 'entityMatches', 'proposals'])->findOrFail($id);

        return response()->json([
            'ok' => true,
            'document' => $doc,
            'extraction' => $doc->extraction,
            'matches' => $doc->entityMatches,
            'proposals' => $doc->proposals,
        ]);
    }
}
