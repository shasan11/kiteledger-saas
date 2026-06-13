<?php

namespace App\Services\Documents;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use ZipArchive;

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
            $prepared = $this->prepareDocumentForAi($doc);

            $result = $this->ai->extract(
                $prepared['base64'],
                $prepared['mime'],
                DocumentExtractionPrompt::system(),
                $prepared['user_prompt'],
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
                'file_name' => $doc->original_file_name ?? null,
                'mime_type' => $doc->mime_type ?? null,
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

    private function prepareDocumentForAi(DocumentUpload $doc): array
    {
        $base64 = $this->storage->readBase64($doc);

        if (!$base64) {
            throw new RuntimeException('Uploaded file could not be read.');
        }

        $mime = $this->detectMimeType($doc);
        $extension = $this->detectExtension($doc);

        if ($this->isPdf($mime, $extension)) {
            return [
                'base64' => $base64,
                'mime' => 'application/pdf',
                'user_prompt' => DocumentExtractionPrompt::user(),
            ];
        }

        if ($this->isDocx($mime, $extension)) {
            $binary = base64_decode($base64, true);

            if ($binary === false) {
                throw new RuntimeException('Word file could not be decoded.');
            }

            $text = $this->extractTextFromDocxBinary($binary);

            if (trim($text) === '') {
                throw new RuntimeException('No readable text was found inside the Word document.');
            }

            return [
                'base64' => base64_encode($text),
                'mime' => 'text/plain',
                'user_prompt' => DocumentExtractionPrompt::user()
                    . "\n\nThe uploaded Word document was converted to plain text before extraction. Extract the accounting/document data from the text content.",
            ];
        }

        if ($this->isOldDoc($mime, $extension)) {
            throw new RuntimeException(
                'Old .doc Word files are not supported by this scanner. Please upload the file as .docx.'
            );
        }

        throw new RuntimeException('Invalid file type. Only PDF and DOCX files are supported.');
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

    private function extractTextFromDocxBinary(string $binary): string
    {
        if (!class_exists(ZipArchive::class)) {
            throw new RuntimeException('PHP Zip extension is required to read DOCX files.');
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'docx_');

        if (!$tempFile) {
            throw new RuntimeException('Could not create temporary file for DOCX processing.');
        }

        file_put_contents($tempFile, $binary);

        $zip = new ZipArchive();
        $opened = $zip->open($tempFile);

        if ($opened !== true) {
            @unlink($tempFile);
            throw new RuntimeException('Invalid DOCX file. The file could not be opened.');
        }

        $textParts = [];

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

        foreach ($xmlFiles as $xmlFile) {
            $xml = $zip->getFromName($xmlFile);

            if ($xml !== false) {
                $textParts[] = $this->extractTextFromWordXml($xml);
            }
        }

        $zip->close();
        @unlink($tempFile);

        return trim(implode("\n\n", array_filter($textParts)));
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
}