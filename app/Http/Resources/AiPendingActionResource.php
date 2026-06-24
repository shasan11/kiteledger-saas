<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Safe public representation of an AI pending action. The model uses a UUID
 * primary key, so `id` is safe to expose. Internal foreign keys (user_id,
 * branch_id, approved_by), raw metadata, and the internal numeric target id are
 * deliberately omitted so the AI never leaks tenant/scope internals.
 */
class AiPendingActionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $payload = is_array($this->payload) ? $this->payload : [];
        $metadata = is_array($this->metadata) ? $this->metadata : [];
        $highRisk = in_array($this->risk_level, ['high', 'critical'], true);

        return [
            'id' => $this->id,
            'action_type' => $this->action_type,
            'module' => $this->module,
            'title' => $this->title,
            'summary' => $this->summary,
            'risk_level' => $this->risk_level,
            'risk_reasons' => $this->risk_reasons ?? [],
            'status' => $this->status,
            'requires_approval' => true,
            'requires_confirmation' => $highRisk || ($metadata['requires_confirmation'] ?? false),
            'confirmation_text' => $metadata['confirmation_text'] ?? null,
            'preview' => $metadata['preview'] ?? $payload['preview'] ?? null,
            'before' => $metadata['before'] ?? ($payload['preview']['before'] ?? null),
            'after' => $metadata['after'] ?? ($payload['preview']['after'] ?? null),
            'missing_fields' => $metadata['missing_fields'] ?? [],
            'validation_errors' => $metadata['validation_errors'] ?? [],
            'open_url' => $metadata['result']['open_url'] ?? null,
            'result_id' => $metadata['result']['id'] ?? null,
            'error_message' => $this->safeError(),
            'created_at' => optional($this->created_at)->toIso8601String(),
            'approved_at' => optional($this->approved_at)->toIso8601String(),
            'executed_at' => optional($this->executed_at)->toIso8601String(),
        ];
    }

    /**
     * Never surface raw exception detail to the client.
     */
    private function safeError(): ?string
    {
        if (! $this->error_message) {
            return null;
        }

        // Validation-style messages are user-safe; anything longer/with a stack
        // trace is collapsed to a generic message.
        $message = (string) $this->error_message;

        if (mb_strlen($message) > 240 || str_contains($message, "\n#") || str_contains($message, 'Stack trace')) {
            return 'The action could not be completed. Please review and try again.';
        }

        return $message;
    }
}
