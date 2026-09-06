<?php

namespace App\Services\Documents;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Services\Documents\Contracts\DocumentExtractionResult;
use App\Services\Documents\Pipeline\ChunkResultMerger;
use App\Services\Documents\Pipeline\DocumentChunk;
use App\Services\Documents\Pipeline\DocumentChunkPlanner;
use App\Services\Documents\Pipeline\DocumentErrorCode;
use App\Services\Documents\Pipeline\DocumentPageAnalysis;
use App\Services\Documents\Pipeline\DocumentPageService;
use App\Services\Documents\Pipeline\DocumentProcessingStage;
use App\Services\Documents\Pipeline\StructuredOutputResult;
use App\Services\Documents\Pipeline\StructuredOutputValidator;
use App\Services\Documents\Schema\DocumentTypeClassifier;
use App\Services\Documents\Schema\DocumentTypePrompt;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use ZipArchive;

class DocumentAiExtractionService
{
    private const DEFAULT_MAX_TEXT_CHARS = 30000;

    public function __construct(
        protected DocumentStorageService $storage,
        protected DocumentAiClient $ai,
        protected DocumentExtractionNormalizer $normalizer,
        protected DocumentExtractionNormalizerV2 $normalizerV2,
        protected StructuredOutputValidator $structuredOutput,
        protected DocumentPageService $pages,
        protected DocumentChunkPlanner $chunkPlanner,
        protected ChunkResultMerger $chunkMerger,
        protected DocumentTypeClassifier $classifier,
        protected DocumentTypePrompt $typePrompt,
    ) {}

    /**
     * Stage one of extraction: narrow the schema to the document's own type.
     *
     * Classification is deterministic and runs on the text we already have, so
     * it costs nothing. When it cannot decide, the generic schema is used and
     * behaviour is unchanged — a confident wrong guess would be far worse than
     * asking for every section.
     */
    private function promptForText(string $text): string
    {
        $type = $this->classifier->classify($text);

        return $type !== null
            ? $this->typePrompt->build($type)
            : DocumentExtractionPrompt::user();
    }

    /**
     * Records the current pipeline position so the UI can show a truthful
     * stage instead of an invented percentage. Extra attributes are merged in
     * to keep this to one write per transition.
     */
    private function stage(DocumentExtraction $extraction, DocumentProcessingStage $stage, array $attributes = []): void
    {
        $extraction->update(array_merge(['stage' => $stage->value], $attributes));
    }

    /** Attempts are numbered per document so history has a stable order. */
    private function nextAttemptNumber(DocumentUpload $doc): int
    {
        return (int) DocumentExtraction::query()
            ->where('document_upload_id', $doc->id)
            ->max('attempt_number') + 1;
    }

    public function run(DocumentUpload $doc): DocumentExtraction
    {
        $extraction = DocumentExtraction::create([
            'document_upload_id' => $doc->id,
            'status' => 'queued',
            'attempt_number' => $this->nextAttemptNumber($doc),
        ]);

        return $this->process($doc, $extraction);
    }

    public function process(DocumentUpload $doc, DocumentExtraction $extraction): DocumentExtraction
    {
        if (! $this->storage->exists($doc)) {
            $message = 'Document file is missing.';
            $extraction->update([
                'status' => 'failed',
                'error_message' => $message,
                'completed_at' => now(),
            ]);
            $doc->update(['status' => 'failed']);

            throw new RuntimeException($message);
        }

        $startedAt = microtime(true);

        $this->stage($extraction, DocumentProcessingStage::Preparing, [
            'status' => 'processing',
            'provider' => $this->ai->provider(),
            'model' => $this->ai->model(),
            'started_at' => now(),
            'completed_at' => null,
            'error_message' => null,
            'error_code' => null,
            // One extraction row is one scan attempt. Queue retries of that
            // same row retain its number instead of appearing as new scans.
            'attempt_number' => $extraction->attempt_number ?: $this->nextAttemptNumber($doc),
        ]);

        $doc->update(['status' => 'processing']);

        try {
            $prepared = $this->prepareDocumentForAi($doc);

            $this->stage($extraction, DocumentProcessingStage::Reading);

            /** @var DocumentChunk[] $chunks */
            $chunks = $prepared['chunks'] ?? [];

            if (count($chunks) > 1) {
                // A long document is read in page groups and merged
                // deterministically. Truncating it at a character limit
                // produced a scan that looked complete while silently omitting
                // most of the pages.
                [$json, $structured, $result, $coverage] = $this->extractInChunks($extraction, $prepared, $chunks);
            } else {
                $result = $this->ai->extract(
                    $prepared['base64'],
                    $prepared['mime'],
                    DocumentExtractionPrompt::system(),
                    $prepared['user_prompt'],
                );

                $this->stage($extraction, DocumentProcessingStage::Extracting);

                // Malformed output is never accepted quietly: one deterministic
                // repair pass, then an explicit, user-facing failure.
                $structured = $this->structuredOutput->validate((string) ($result['text'] ?? ''));

                if (! $structured->ok) {
                    throw new RuntimeException(
                        ($structured->errorCode ?? DocumentErrorCode::ExtractionInvalid)->message()
                    );
                }

                $json = $structured->data;
                $coverage = null;
            }

            $this->stage($extraction, DocumentProcessingStage::Normalizing);

            // v1 stays authoritative for the existing review UI; v2 is written
            // alongside it so the new field-level contract can be adopted
            // without a breaking migration of live records.
            $normalized = $this->normalizer->normalize($json);
            $v2 = $this->normalizerV2->normalize($json);

            $this->stage($extraction, DocumentProcessingStage::Validating);

            /** @var DocumentPageAnalysis|null $analysis */
            $analysis = $prepared['analysis'] ?? null;

            $warnings = array_values(array_unique(array_merge(
                $normalized['warnings'] ?? [],
                $structured->warnings(),
                $analysis?->warnings() ?? [],
                $coverage['warnings'] ?? [],
            )));
            $normalized['warnings'] = $warnings;

            $structuredPayload = $v2->toArray(includeDebug: true);

            // Coverage travels with the structured payload so the review screen
            // can state which pages were read rather than implying all of them.
            if ($coverage !== null) {
                $structuredPayload['coverage'] = $coverage['coverage'];
            }

            if ($analysis !== null) {
                $structuredPayload['pages'] = $analysis->pageMap();
            }

            $extraction->update([
                'status' => 'completed',
                'stage' => DocumentProcessingStage::ReadyForReview->value,
                // Real page structure, not a guess. used_ocr records whether
                // vision was needed, which explains cost and quality later.
                'page_count' => $analysis?->pageCount ?: null,
                'used_ocr' => $analysis === null || ! $analysis->canUseNativeText(),
                'raw_text' => $result['text'] ?? null,
                'extracted_json' => $json,
                'normalized_json' => $normalized,
                'structured_json' => $structuredPayload,
                'schema_version' => DocumentExtractionResult::SCHEMA_VERSION,
                'confidence_score' => $normalized['confidence'] ?? null,
                'review_issue_count' => $v2->reviewIssueCount(),
                'partial' => $structured->partial
                    || (bool) $analysis?->truncated
                    || ($coverage !== null && ! ($coverage['coverage']['complete'] ?? true)),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'completed_at' => now(),
            ]);

            $doc->update([
                'status' => 'extracted',
                'document_type' => $normalized['document_type'] ?? $doc->document_type,
            ]);

            return $extraction;
        } catch (\Throwable $e) {
            $message = $this->safeErrorMessage($e);
            $code = DocumentErrorCode::fromThrowableMessage(
                $e->getMessage(),
                method_exists($e, 'getErrorCode') ? (string) $e->getErrorCode() : '',
            );

            Log::error('Document extraction failed', [
                'document_upload_id' => $doc->id,
                'file_name' => $doc->original_file_name ?? null,
                'mime_type' => $doc->mime_type ?? null,
                'error_code' => $code->value,
                'error' => $message,
            ]);

            $extraction->update([
                'status' => 'failed',
                'stage' => DocumentProcessingStage::Failed->value,
                // The stored message is the actionable one shown to the user;
                // the raw provider text stays in the log.
                'error_message' => $code === DocumentErrorCode::Unknown ? $message : $code->message(),
                'error_code' => $code->value,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'completed_at' => now(),
            ]);

            $doc->update(['status' => 'failed']);

            throw $e;
        }
    }

    /**
     * Extracts a long document in page groups and merges the results.
     *
     * Each chunk is a separate model request. A chunk that fails does not fail
     * the document: its pages are recorded as unread and the reviewer is told,
     * because a partial statement the user knows is partial is far more useful
     * than one silently missing three weeks of transactions.
     *
     * @param  DocumentChunk[]  $chunks
     * @return array{0: array<string, mixed>, 1: StructuredOutputResult, 2: array<string, mixed>, 3: array<string, mixed>}
     */
    private function extractInChunks(DocumentExtraction $extraction, array $prepared, array $chunks): array
    {
        $results = [];
        $lastResult = [];

        foreach ($chunks as $position => $chunk) {
            // The stage is re-stamped per section so a long document does not
            // sit on one status for minutes. Section-level detail would need a
            // new column; the stage plus the final coverage report is enough to
            // keep the user honestly informed.
            $this->stage($extraction, DocumentProcessingStage::Extracting);

            try {
                $response = $this->ai->extract(
                    base64_encode($this->sanitizeDocumentText($chunk->text)),
                    'text/plain',
                    DocumentExtractionPrompt::system(),
                    $prepared['user_prompt']
                        ."\n\nThis is section ".($position + 1).' of '.count($chunks)
                        .' of a longer document, covering '.$chunk->label()
                        .'. Extract only what appears in this section. Do not guess at values from other sections.',
                );

                $lastResult = $response;
                $validated = $this->structuredOutput->validate((string) ($response['text'] ?? ''));

                $results[] = [
                    'chunk' => $chunk,
                    'data' => $validated->ok ? $validated->data : null,
                    'error' => $validated->ok ? null : 'invalid_output',
                ];
            } catch (\Throwable $e) {
                // One failed section must not lose the sections that worked.
                Log::warning('Document chunk extraction failed', [
                    'document_extraction_id' => $extraction->id,
                    'chunk' => $chunk->label(),
                    'error' => mb_substr($e->getMessage(), 0, 200),
                ]);

                $results[] = ['chunk' => $chunk, 'data' => null, 'error' => 'request_failed'];
            }
        }

        $pagesPlanned = [];

        foreach ($chunks as $chunk) {
            $pagesPlanned = array_merge($pagesPlanned, $chunk->pageNumbers);
        }

        $merged = $this->chunkMerger->merge($results, $pagesPlanned);

        // Every section failing is a failed scan, not a completed one with an
        // empty result.
        if ($merged->pagesProcessed === []) {
            throw new RuntimeException(DocumentErrorCode::ExtractionInvalid->message());
        }

        $structured = $this->structuredOutput->validate(json_encode($merged->data, JSON_UNESCAPED_SLASHES) ?: '');

        if (! $structured->ok) {
            throw new RuntimeException(
                ($structured->errorCode ?? DocumentErrorCode::ExtractionInvalid)->message()
            );
        }

        $warnings = $merged->warnings;

        if ($merged->pagesFailed !== []) {
            $warnings[] = 'Pages '.implode(', ', $merged->pagesFailed)
                .' could not be read. The details from those pages are missing from this extraction.';
        }

        return [
            $structured->data,
            $structured,
            $lastResult,
            ['coverage' => $merged->coverage(), 'warnings' => $warnings],
        ];
    }

    private function prepareDocumentForAi(DocumentUpload $doc): array
    {
        $base64 = $this->storage->readBase64($doc);

        if (! $base64) {
            throw new RuntimeException('Uploaded file could not be read.');
        }

        $mime = $this->detectMimeType($doc);
        $extension = $this->detectExtension($doc);

        if ($this->isPdf($mime, $extension)) {
            $binary = base64_decode($base64, true);

            $analysis = $binary === false
                ? DocumentPageAnalysis::unreadable(false)
                : $this->pages->analyze($binary);

            if ($analysis->encrypted) {
                throw new RuntimeException(DocumentErrorCode::PasswordProtected->message());
            }

            $budget = (int) config('documents.max_plain_text_chars', 60000);

            /*
             * A digitally generated PDF already contains its own text. Reading
             * that directly is exact and cheap; sending the same page through
             * vision re-transcribes data we can simply read, introducing errors
             * and cost. Scans have no text layer and still go to vision.
             */
            if ($analysis->canUseNativeText()) {
                $text = $analysis->toPromptText($budget);
                $chunks = $this->chunkPlanner->plan($analysis->pages, $budget);

                return [
                    'base64' => base64_encode($this->sanitizeDocumentText($text)),
                    'mime' => 'text/plain',
                    'user_prompt' => $this->promptForText($text)
                        ."\n\nThe document's own text layer is provided below, split by page. "
                        .'Cite the page number a value came from where you can.',
                    'analysis' => $analysis,
                    'chunks' => $chunks,
                ];
            }

            /*
             * A mixed PDF — some digitally generated pages, some scans — used to
             * pass the document-wide text check and be treated as fully
             * digital, which dropped every scanned page's contents without a
             * warning. Both sources are now sent: the file itself so vision can
             * read the scans, and the text layer so the digital pages are read
             * exactly rather than re-transcribed.
             */
            if ($analysis->isMixed()) {
                return [
                    'base64' => $base64,
                    'mime' => 'application/pdf',
                    'user_prompt' => DocumentExtractionPrompt::user()
                        ."\n\nSome pages of this document are digitally generated and some are scans. "
                        ."The text layer of the digital pages is reproduced below; read the remaining pages from the attached document.\n\n"
                        .$this->sanitizeDocumentText($analysis->toPromptText($budget)),
                    'analysis' => $analysis,
                    'chunks' => [],
                ];
            }

            return [
                'base64' => $base64,
                'mime' => 'application/pdf',
                'user_prompt' => DocumentExtractionPrompt::user(),
                'analysis' => $analysis,
                'chunks' => [],
            ];
        }

        if ($this->isDocx($mime, $extension)) {
            $binary = base64_decode($base64, true);

            if ($binary === false) {
                throw new RuntimeException('Word file could not be decoded.');
            }

            $text = $this->sanitizeDocumentText($this->extractTextFromDocxBinary($binary));

            if (trim($text) === '') {
                throw new RuntimeException('No readable text was found inside the Word document.');
            }

            return [
                'base64' => base64_encode($text),
                'mime' => 'text/plain',
                'user_prompt' => $this->promptForText($text)
                    ."\n\nThe uploaded Word document was converted to plain text before extraction. Extract the accounting/document data from the text content.",
            ];
        }

        if ($this->isImage($mime, $extension)) {
            return [
                'base64' => $base64,
                'mime' => $mime,
                'user_prompt' => DocumentExtractionPrompt::user()
                    ."\n\nThe uploaded document is an image. Extract visible accounting/document data from the image.",
            ];
        }

        if ($this->isOldDoc($mime, $extension)) {
            throw new RuntimeException(
                'Old .doc Word files are not supported by this scanner. Please upload the file as .docx.'
            );
        }

        throw new RuntimeException('Invalid file type. Only PDF, DOCX, JPG, PNG, and WEBP files are supported.');
    }

    private function detectMimeType(DocumentUpload $doc): string
    {
        $mime = strtolower((string) ($doc->mime_type ?? ''));

        if ($mime !== '') {
            return $mime;
        }

        $extension = $this->detectExtension($doc);

        return match ($extension) {
            'pdf' => 'application/pdf',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }

    private function detectExtension(DocumentUpload $doc): string
    {
        $fileName = (string) (
            $doc->original_file_name
            ?? $doc->file_name
            ?? $doc->path
            ?? ''
        );

        return strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    }

    private function isPdf(string $mime, string $extension): bool
    {
        return $extension === 'pdf'
            || in_array($mime, [
                'application/pdf',
                'application/x-pdf',
            ], true);
    }

    private function isDocx(string $mime, string $extension): bool
    {
        return $extension === 'docx'
            || in_array($mime, [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/zip',
                'application/octet-stream',
            ], true) && $extension === 'docx';
    }

    private function isOldDoc(string $mime, string $extension): bool
    {
        return $extension === 'doc'
            || in_array($mime, [
                'application/msword',
                'application/vnd.ms-word',
                'application/x-msword',
            ], true);
    }

    private function isImage(string $mime, string $extension): bool
    {
        return in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)
            || in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true);
    }

    private function extractTextFromDocxBinary(string $binary): string
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('PHP Zip extension is required to read DOCX files.');
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'docx_');

        if (! $tempFile) {
            throw new RuntimeException('Could not create temporary file for DOCX processing.');
        }

        // try/finally so the temp file is removed even when XML parsing throws.
        try {
            file_put_contents($tempFile, $binary);

            $zip = new ZipArchive;

            if ($zip->open($tempFile) !== true) {
                throw new RuntimeException('Invalid DOCX file. The file could not be opened.');
            }

            $xmlFiles = [
                'word/document.xml',
                'word/header1.xml',
                'word/header2.xml',
                'word/header3.xml',
                'word/footer1.xml',
                'word/footer2.xml',
                'word/footer3.xml',
                'word/footnotes.xml',
                'word/endnotes.xml',
            ];

            $textParts = [];

            try {
                foreach ($xmlFiles as $xmlFile) {
                    $xml = $zip->getFromName($xmlFile);

                    if ($xml !== false) {
                        $textParts[] = $this->extractTextFromWordXml($xml);
                    }
                }
            } finally {
                $zip->close();
            }

            return trim(implode("\n\n", array_filter($textParts)));
        } finally {
            @unlink($tempFile);
        }
    }

    private function extractTextFromWordXml(string $xml): string
    {
        $xml = preg_replace('/<w:tab\s*\/>/', "\t", $xml);
        $xml = preg_replace('/<w:br\s*\/>/', "\n", $xml);
        $xml = preg_replace('/<\/w:p>/', "\n", $xml);
        $xml = preg_replace('/<\/w:tr>/', "\n", $xml);
        $xml = preg_replace('/<\/w:tc>/', "\t", $xml);

        $text = strip_tags($xml);

        $text = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');

        $text = preg_replace("/[ \t]+/", ' ', $text);
        $text = preg_replace("/\n{3,}/", "\n\n", $text);

        return trim($text);
    }

    private function parseJson(string $text): array
    {
        $text = trim($text);

        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text);
            $text = trim($text);
        }

        $decoded = json_decode($text, true);

        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $text, $m)) {
            $decoded = json_decode($m[0], true);

            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [
            'document_type' => 'other',
            'confidence' => 0,
            'warnings' => ['AI response was not valid JSON.'],
            'raw' => mb_substr($text, 0, 2000),
        ];
    }

    private function sanitizeDocumentText(string $text): string
    {
        $text = preg_replace('/-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----/s', '[redacted private key]', $text) ?? $text;

        foreach ([
            '/Bearer\s+[A-Za-z0-9._\-]+/i',
            '/api[_-]?key\s*[:=]\s*\S+/i',
            '/password\s*[:=]\s*\S+/i',
            '/sk-[A-Za-z0-9_\-]{12,}/',
        ] as $pattern) {
            $text = preg_replace($pattern, '[redacted]', $text) ?? $text;
        }

        $limit = (int) config('documents.max_plain_text_chars', self::DEFAULT_MAX_TEXT_CHARS);

        return mb_substr($text, 0, $limit > 0 ? $limit : self::DEFAULT_MAX_TEXT_CHARS);
    }

    private function safeErrorMessage(\Throwable $e): string
    {
        $message = $e->getMessage() ?: 'Document AI extraction failed.';

        return mb_substr($this->sanitizeDocumentText($message), 0, 500);
    }
}
