<?php

namespace App\Services\Documents;

use App\Models\DocumentUpload;
use App\Services\Media\MediaStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class DocumentStorageService
{
    public const ALLOWED_MIMES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'webp'];

    public const INLINE_PREVIEW_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public function maxFileSizeBytes(): int
    {
        $mb = (int) config('documents.max_upload_mb', 10);
        return max(1, $mb) * 1024 * 1024;
    }

    public function disk(): string
    {
        return app(MediaStorageService::class)->disk();
    }

    public function validateFile(UploadedFile $file): void
    {
        if (!$file->isValid()) {
            throw new RuntimeException('Invalid uploaded file.');
        }

        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            throw new RuntimeException('Unsupported file type. Allowed: pdf, docx, jpg, jpeg, png, webp.');
        }

        $mime = $file->getMimeType();
        if ($mime && !in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new RuntimeException('Unsupported MIME type: ' . $mime);
        }

        if ($file->getSize() > $this->maxFileSizeBytes()) {
            throw new RuntimeException('File exceeds maximum size of ' . config('documents.max_upload_mb', 10) . ' MB.');
        }
    }

    public function store(UploadedFile $file): array
    {
        $this->validateFile($file);

        $hash = hash_file('sha256', $file->getRealPath());
        $extension = strtolower($file->getClientOriginalExtension());
        $storedExtension = $extension === 'jpeg' ? 'jpg' : $extension;
        $storageName = (string) Str::uuid().'.'.$storedExtension;
        $folder = 'documents/'.date('Y');
        $path = $file->storeAs($folder, $storageName, $this->disk());

        if (!$path) {
            throw new RuntimeException('Could not store uploaded document.');
        }

        return [
            'file_path' => $path,
            'original_file_name' => $this->sanitizeOriginalName($file->getClientOriginalName()),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'file_size' => $file->getSize(),
            'file_hash' => $hash,
        ];
    }

    public function findDuplicateByHash(string $hash, ?string $excludeId = null): ?DocumentUpload
    {
        $q = DocumentUpload::query()->where('file_hash', $hash);
        if ($excludeId) {
            $q->where('id', '!=', $excludeId);
        }
        return $q->first();
    }

    public function previewUrl(DocumentUpload $doc): string
    {
        return route('api.document-uploads.preview', ['publicId' => $doc->public_id]);
    }

    public function streamResponse(DocumentUpload $doc)
    {
        $disk = Storage::disk($this->disk());
        if (!$disk->exists($doc->file_path)) {
            throw new RuntimeException('Document file is missing.');
        }
        $mime = (string) ($doc->mime_type ?: $disk->mimeType($doc->file_path) ?: 'application/octet-stream');
        $disposition = in_array($mime, self::INLINE_PREVIEW_MIMES, true) ? 'inline' : 'attachment';
        $filename = $this->sanitizeOriginalName($doc->original_file_name ?: 'document');

        return $disk->response($doc->file_path, $filename, [
            'Content-Type' => $mime,
            'Content-Disposition' => $disposition.'; filename="'.$this->escapeHeaderFilename($filename).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }

    public function delete(DocumentUpload $doc): void
    {
        try {
            Storage::disk($this->disk())->delete($doc->file_path);
        } catch (\Throwable $e) {
            // ignore
        }
    }

    public function readBase64(DocumentUpload $doc): string
    {
        $disk = Storage::disk($this->disk());
        $contents = $disk->get($doc->file_path);
        return base64_encode($contents);
    }

    public function exists(DocumentUpload $doc): bool
    {
        return filled($doc->file_path) && Storage::disk($this->disk())->exists($doc->file_path);
    }

    private function sanitizeOriginalName(string $name): string
    {
        $name = str_replace(["\0", '/', '\\'], ' ', $name);
        $name = preg_replace('/\s+/', ' ', $name) ?: 'document';
        $name = trim($name);

        return mb_substr($name !== '' ? $name : 'document', 0, 180);
    }

    private function escapeHeaderFilename(string $filename): string
    {
        return str_replace(['"', "\r", "\n"], ['', '', ''], $filename);
    }
}
