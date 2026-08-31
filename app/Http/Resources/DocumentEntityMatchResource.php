<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentEntityMatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $suggestions = collect($this->options['suggestions'] ?? [])->map(fn (array $suggestion) => [
            'id' => $suggestion['id'] ?? null,
            'name' => $suggestion['name'] ?? null,
            'code' => $suggestion['code'] ?? null,
            'reason' => $suggestion['reason'] ?? null,
        ])->filter(fn (array $suggestion) => filled($suggestion['id']))->values()->all();

        return [
            // This UUID is an action token scoped and authorized again by the
            // controller. Internal document/extraction IDs are never exposed.
            'id' => $this->id,
            'entity_type' => $this->entity_type,
            'extracted_name' => $this->extracted_name,
            'match_status' => $this->match_status,
            'confidence_score' => $this->confidence_score,
            'linked' => in_array($this->match_status, ['matched', 'created', 'user_selected'], true),
            'options' => ['suggestions' => $suggestions],
        ];
    }
}
