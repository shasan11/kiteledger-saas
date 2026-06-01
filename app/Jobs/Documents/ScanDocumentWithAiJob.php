<?php

namespace App\Jobs\Documents;

use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAiExtractionService;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentEntityMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ScanDocumentWithAiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 240;
    public int $tries = 1;

    public function __construct(public string $documentUploadId) {}

    public function handle(
        DocumentAiExtractionService $extractor,
        DocumentEntityMatcher $matcher,
        DocumentAuditService $audit,
    ): void {
        $doc = DocumentUpload::query()->findOrFail($this->documentUploadId);
        $audit->log('scan.started', ['document_upload_id' => $doc->id]);

        $extraction = $extractor->run($doc);
        $audit->log('scan.completed', [
            'document_upload_id' => $doc->id,
            'extraction_id' => $extraction->id,
            'confidence' => $extraction->confidence_score,
        ]);

        if ($extraction->status === 'completed' && is_array($extraction->normalized_json)) {
            $matcher->matchAll($doc, $extraction->normalized_json);
            $audit->log('matching.completed', ['document_upload_id' => $doc->id]);
            $doc->update(['status' => 'needs_review']);
        }
    }

    public function failed(\Throwable $e): void
    {
        DocumentUpload::query()->where('id', $this->documentUploadId)->update(['status' => 'failed']);
    }
}
