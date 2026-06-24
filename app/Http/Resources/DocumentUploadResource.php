<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentUploadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'label' => $this->label,
            'original_name' => $this->original_file_name,
            'mime_type' => $this->mime_type,
            'size' => $this->file_size,
            'human_size' => $this->humanSize((int) $this->file_size),
            'status' => $this->status,
            'document_type' => $this->document_type,
            'uploaded_at' => optional($this->created_at)->toISOString(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
            'preview_url' => route('api.document-uploads.preview', ['publicId' => $this->public_id]),
            'extraction_status' => $this->when(
                $this->relationLoaded('extraction'),
                fn () => $this->extraction?->status
            ),
            'extraction_public_id' => $this->when(
                $this->relationLoaded('extraction'),
                fn () => $this->extraction?->public_id
            ),
            'extraction' => $this->when(
                $this->relationLoaded('extraction') && $this->extraction,
                fn () => new DocumentExtractionResource($this->extraction)
            ),
            'proposals_count' => $this->whenCounted('proposals'),
            'notes' => $this->notes,
            'metadata' => $this->safeMetadata(),
        ];
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        $units = ['KB', 'MB', 'GB'];
        $size = $bytes / 1024;

        foreach ($units as $unit) {
            if ($size < 1024 || $unit === 'GB') {
                return number_format($size, $size >= 10 ? 1 : 2).' '.$unit;
            }

            $size /= 1024;
        }

        return $bytes.' B';
    }

    private function safeMetadata(): array
    {
        $metadata = is_array($this->metadata) ? $this->metadata : [];
        $allowed = ['page_count', 'source', 'category'];

        return array_intersect_key($metadata, array_flip($allowed));
    }
}
