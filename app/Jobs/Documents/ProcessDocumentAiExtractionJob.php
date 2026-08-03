<?php

namespace App\Jobs\Documents;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Services\AI\AiProviderException;
use App\Services\Documents\DocumentAiExtractionService;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentEntityMatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Runs one AI extraction attempt for one uploaded document.
 *
 * Tenancy is supplied by Stancl's QueueTenancyBootstrapper (registered in
 * config/tenancy.php), which stamps the tenant onto the job payload and
 * re-initializes it before handle()/failed() run. This job therefore must
 * never resolve a tenant itself, and must never touch the central connection.
 */
class ProcessDocumentAiExtractionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Provider failures that will never succeed on a retry — bad credentials,
     * an unusable model, an unsupported file. Re-running these just burns
     * quota and delays the user's error message.
     */
    private const PERMANENT_ERROR_CODES = [
        'AI_DISABLED',
        'AI_API_KEY_MISSING',
        'AI_PROVIDER_AUTH_FAILED',
        'AI_VISION_UNSUPPORTED',
        'AI_MODEL_INVALID',
        'AI_SSL_CERTIFICATE_ERROR',
        'INVALID_FILE_TYPE',
        'DOCX_NOT_CONVERTED',
        'DOCUMENT_TEXT_INVALID',
    ];

    public function __construct(
        public string $documentUploadId,
        public string $documentExtractionId,
    ) {
        $this->onQueue((string) config('documents.queue', 'default'));
    }

    public function tries(): int
    {
        return max(1, (int) config('documents.scan_tries', 3));
    }

    /** Spaced retries so a rate-limited or overloaded provider can recover. */
    public function backoff(): array
    {
        return [30, 120, 300];
    }

    /**
     * Hard ceiling regardless of attempts, sized off the per-attempt timeout so
     * a document can never sit "processing" indefinitely.
     */
    public function retryUntil(): Carbon
    {
        $timeout = max(60, (int) config('documents.scan_timeout_seconds', 120));

        return now()->addSeconds(($timeout + 60) * $this->tries());
    }

    public function timeout(): int
    {
        return max(60, (int) config('documents.scan_timeout_seconds', 120)) + 60;
    }

    public function handle(
        DocumentAiExtractionService $extractor,
        DocumentEntityMatcher $matcher,
        DocumentAuditService $audit,
    ): void {
        $doc = DocumentUpload::query()->find($this->documentUploadId);
        $extraction = DocumentExtraction::query()->find($this->documentExtractionId);

        // The document or attempt was deleted, or a newer scan superseded this
        // one, while the job sat in the queue. Nothing left to do.
        if (! $doc || ! $extraction) {
            return;
        }

        if (! $this->isCurrentAttempt($doc, $extraction)) {
            $audit->log('scan.superseded', [
                'document_upload_id' => $doc->id,
                'document_extraction_id' => $extraction->id,
            ]);

            return;
        }

        $audit->log('scan.started', [
            'document_upload_id' => $doc->id,
            'document_extraction_id' => $extraction->id,
            'attempt' => $this->attempts(),
        ]);

        try {
            $extraction = $extractor->process($doc, $extraction);
        } catch (Throwable $e) {
            if ($this->isPermanent($e)) {
                // Skip the remaining attempts and go straight to failed().
                $this->fail($e);

                return;
            }

            throw $e;
        }

        $audit->log('scan.completed', [
            'document_upload_id' => $doc->id,
            'document_extraction_id' => $extraction->id,
            'confidence' => $extraction->confidence_score,
            'status' => $extraction->status,
        ]);

        if ($extraction->status === 'completed' && is_array($extraction->normalized_json)) {
            $matcher->matchAll($doc, $extraction->normalized_json);
            $audit->log('matching.completed', ['document_upload_id' => $doc->id]);
            $doc->update(['status' => 'needs_review']);
        }
    }

    public function failed(?Throwable $e): void
    {
        $message = mb_substr($e?->getMessage() ?: 'Document AI scan failed.', 0, 500);

        $extraction = DocumentExtraction::query()->find($this->documentExtractionId);

        if (! $extraction) {
            return;
        }

        // Only the attempt this job owns may be marked failed, and only if it
        // has not already reached a terminal state. This stops a late failure
        // from overwriting a newer attempt that already succeeded.
        if (in_array($extraction->status, ['queued', 'processing'], true)) {
            $extraction->update([
                'status' => 'failed',
                'error_message' => $message,
                'completed_at' => now(),
            ]);
        }

        $doc = DocumentUpload::query()->find($this->documentUploadId);

        if ($doc && $this->isCurrentAttempt($doc, $extraction) && in_array($doc->status, ['queued', 'processing'], true)) {
            $doc->update(['status' => 'failed']);
        }
    }

    /**
     * True when no newer extraction attempt exists for the document.
     */
    private function isCurrentAttempt(DocumentUpload $doc, DocumentExtraction $extraction): bool
    {
        return ! DocumentExtraction::query()
            ->where('document_upload_id', $doc->id)
            ->where('id', '!=', $extraction->id)
            ->where('created_at', '>=', $extraction->created_at)
            ->exists();
    }

    private function isPermanent(Throwable $e): bool
    {
        if ($e instanceof AiProviderException) {
            return in_array($e->getErrorCode(), self::PERMANENT_ERROR_CODES, true);
        }

        // Structural problems raised by the extraction service (missing file,
        // unreadable DOCX, unsupported type) are deterministic.
        return $e instanceof \RuntimeException;
    }
}
