<?php

namespace App\Services\Documents;

use App\Models\DocumentUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DocumentStorageService
{
    public const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    public function maxFileSizeBytes(): int
    {
        $mb = (int) config('documents.max_upload_mb', 10);
        return max(1, $mb) * 1024 * 1024;
    }

    public function disk(): string
    {
        return (string) config('documents.disk', 'local');
    }

    public function validateFile(UploadedFile $file): void
    {
        if (!$file->isValid()) {
            throw new RuntimeException('Invalid uploaded file.');
        }

        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            throw new RuntimeException('Unsupported file type. Allowed: pdf, jpg, jpeg, png, webp.');
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

        $folder = 'documents/' . date('Y/m');
        $path = $file->store($folder, $this->disk());

        return [
            'file_path' => $path,
            'original_file_name' => $file->getClientOriginalName(),
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
        // Private disk: serve via signed route. Public disk: direct URL.
        $disk = Storage::disk($this->disk());
        try {
            return $disk->url($doc->file_path);
        } catch (\Throwable $e) {
            return route('api.document-uploads.preview', ['id' => $doc->id]);
        }
    }

    public function streamResponse(DocumentUpload $doc)
    {
        $disk = Storage::disk($this->disk());
        if (!$disk->exists($doc->file_path)) {
            throw new RuntimeException('Document file is missing.');
        }
        return $disk->response($doc->file_path, $doc->original_file_name, [
            'Content-Type' => $doc->mime_type,
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
}
