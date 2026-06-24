<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public representation of a stored chat message. Token counts, provider/model,
 * and the internal context blob are kept out of the default payload so prompts
 * and provider internals are never exposed.
 */
class AiMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $context = is_array($this->context) ? $this->context : [];

        return [
            'id' => $this->id,
            'role' => $this->role,
            'content' => $this->content,
            'intent' => $context['intent']['name'] ?? null,
            'mode' => $context['mode'] ?? null,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
