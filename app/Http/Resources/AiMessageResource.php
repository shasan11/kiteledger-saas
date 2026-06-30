<?php

namespace App\Http\Resources;

use App\Services\AI\Rag\AiSourceSanitizer;
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
        return [
            'role' => $this->role,
            'content' => app(AiSourceSanitizer::class)->sanitizeText((string) $this->content),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
