<?php

namespace App\Services\Documents;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use Illuminate\Support\Facades\Log;

class DocumentAiExtractionService
{
    public function __construct(
        protected DocumentStorageService $storage,
        protected DocumentAiClient $ai,
        protected DocumentExtractionNormalizer $normalizer,
    ) {}

    public function run(DocumentUpload $doc): DocumentExtraction
    {
        $extraction = DocumentExtraction::create([
            'document_upload_id' => $doc->id,
            'status' => 'processing',
            'provider' => $this->ai->provider(),
            'model' => $this->ai->model(),
            'started_at' => now(),
        ]);

        $doc->update(['status' => 'processing']);

        try {
            $base64 = $this->storage->readBase64($doc);
            $mime = $doc->mime_type ?: 'application/pdf';

            $result = $this->ai->extract(
                $base64,
                $mime,
                DocumentExtractionPrompt::system(),
                DocumentExtractionPrompt::user(),
            );

            $json = $this->parseJson($result['text'] ?? '');
            $normalized = $this->normalizer->normalize($json);

            $extraction->update([
                'status' => 'completed',
                'raw_text' => $result['text'] ?? null,
                'extracted_json' => $json,
                'normalized_json' => $normalized,
                'confidence_score' => $normalized['confidence'] ?? null,
                'completed_at' => now(),
            ]);

            $doc->update([
                'status' => 'extracted',
                'document_type' => $normalized['document_type'] ?? $doc->document_type,
            ]);

            return $extraction;
        } catch (\Throwable $e) {
            Log::error('Document extraction failed', [
                'document_upload_id' => $doc->id,
                'error' => $e->getMessage(),
            ]);
            $extraction->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
            $doc->update(['status' => 'failed']);
            throw $e;
        }
    }

    private function parseJson(string $text): array
    {
        $text = trim($text);
        // Strip code fences if present
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text);
        }
        $decoded = json_decode($text, true);
        if (is_array($decoded)) return $decoded;

        // Try to find first { ... } block
        if (preg_match('/\{.*\}/s', $text, $m)) {
            $decoded = json_decode($m[0], true);
            if (is_array($decoded)) return $decoded;
        }

        return [
            'document_type' => 'other',
            'confidence' => 0,
            'warnings' => ['AI response was not valid JSON.'],
            'raw' => mb_substr($text, 0, 2000),
        ];
    }
}
