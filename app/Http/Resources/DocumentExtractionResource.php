<?php

namespace App\Http\Resources;

use App\Services\AI\AiPermissionService;
use App\Services\Documents\Pipeline\DocumentErrorCode;
use App\Services\Documents\Pipeline\DocumentProcessingStage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentExtractionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stage = DocumentProcessingStage::fromValue($this->stage);
        $canDebug = $this->canViewDebug($request);

        return [
            'public_id' => $this->public_id,
            'status' => $this->status,
            'document_public_id' => $this->whenLoaded(
                'documentUpload',
                fn () => $this->documentUpload?->public_id
            ),

            // v1 payload, still consumed by the existing review UI.
            'normalized_json' => $this->normalized_json ?? null,
            'confidence' => $this->confidence_score,

            // v2 field-level payload. Raw per-field confidence is stripped for
            // ordinary users — they get states ("Review recommended"), not numbers.
            'review' => $this->reviewPayload($canDebug),

            'stage' => [
                'key' => $stage->value,
                'label' => $stage->label(),
                'position' => $stage->position(),
                'total' => count(DocumentProcessingStage::timeline()),
                'is_terminal' => $stage->isTerminal(),
                'is_active' => $stage->isActive(),
            ],

            'attempt' => [
                'number' => $this->attempt_number ?? 1,
                'duration_ms' => $this->duration_ms,
                'partial' => (bool) $this->partial,
                'review_issue_count' => $this->review_issue_count,
                'schema_version' => $this->schema_version,
            ],

            'error' => $this->errorPayload(),
            'error_message' => $this->safeErrorMessage(),

            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
            'completed_at' => optional($this->completed_at)->toISOString(),
        ];
    }

    /**
     * Field-level review data.
     *
     * Confidence numbers are only included for debug-permitted users; the
     * product deliberately shows a state rather than a percentage, because a
     * "78%" invites the user to reason about a number they cannot calibrate.
     */
    private function reviewPayload(bool $canDebug): ?array
    {
        $structured = $this->structured_json;

        if (! is_array($structured)) {
            return null;
        }

        if (! $canDebug) {
            $structured['overall_confidence'] = null;

            foreach ($structured['fields'] ?? [] as $key => $field) {
                unset($structured['fields'][$key]['confidence']);
            }
        }

        return $structured;
    }

    /** Public error code with an actionable message and recovery options. */
    private function errorPayload(): ?array
    {
        if (! $this->error_code) {
            return null;
        }

        $code = DocumentErrorCode::tryFrom((string) $this->error_code);

        return $code?->toArray() ?? [
            'code' => (string) $this->error_code,
            'message' => $this->safeErrorMessage(),
            'actions' => ['retry'],
            'transient' => false,
        ];
    }

    private function canViewDebug(Request $request): bool
    {
        try {
            return app(AiPermissionService::class)->canViewDebug($request->user());
        } catch (\Throwable) {
            return false;
        }
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
