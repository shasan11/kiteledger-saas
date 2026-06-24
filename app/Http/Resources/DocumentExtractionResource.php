<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentExtractionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'status' => $this->status,
            'document_public_id' => $this->whenLoaded(
                'documentUpload',
                fn () => $this->documentUpload?->public_id
            ),
            'normalized_json' => $this->normalized_json ?? null,
            'confidence' => $this->confidence_score,
            'error_message' => $this->safeErrorMessage(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }

    private function safeErrorMessage(): ?string
    {
        if (! $this->error_message) {
            return null;
        }

        $message = (string) $this->error_message;

        foreach ([
            '/sk-[A-Za-z0-9_\-]{12,}/',
            '/Bearer\s+[A-Za-z0-9._\-]+/i',
            '/api[_-]?key\s*[:=]\s*\S+/i',
            '/password\s*[:=]\s*\S+/i',
        ] as $pattern) {
            $message = preg_replace($pattern, '[redacted]', $message) ?? $message;
        }

        return mb_substr($message, 0, 500);
    }
}
