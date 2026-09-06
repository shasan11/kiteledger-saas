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

        $extra = is_array($this->options['extra'] ?? null) ? $this->options['extra'] : [];
        $linked = in_array($this->match_status, ['matched', 'created', 'user_selected'], true);

        return [
            // This UUID is an action token scoped and authorized again by the
            // controller. Internal document/extraction IDs are never exposed.
            'id' => $this->id,
            'entity_type' => $this->entity_type,
            'extracted_name' => $this->extracted_name,
            'match_status' => $this->match_status,
            'confidence_score' => $this->confidence_score,
            'linked' => $linked,
            // Which line this belongs to, so a product match can be shown on
            // its own line rather than in a separate list of prose the
            // reviewer has to map back to the document themselves.
            'line_index' => $extra['line_index'] ?? null,
            'journal_line_index' => $extra['journal_line_index'] ?? null,
            'role' => $extra['role'] ?? null,
            // "Linked" alone does not say what it linked to, which is the one
            // thing the reviewer needs in order to trust it.
            'matched_label' => $linked ? $this->matchedLabel() : null,
            'options' => ['suggestions' => $suggestions],
        ];
    }

    /**
     * Name of the linked ERP record.
     *
     * A suggestion the reviewer accepted is already in the options list, so it
     * is read from there first and no query is made for the common case.
     */
    private function matchedLabel(): ?string
    {
        $matchedId = (string) ($this->matched_id ?? '');

        if ($matchedId === '') {
            return null;
        }

        foreach (($this->options['suggestions'] ?? []) as $suggestion) {
            if ((string) ($suggestion['id'] ?? '') === $matchedId) {
                return $suggestion['name'] ?? $suggestion['code'] ?? null;
            }
        }

        $model = $this->matched_model;

        if (! is_string($model) || ! class_exists($model)) {
            return null;
        }

        $record = $model::query()->find($matchedId);

        return $record?->name ?? $record?->code ?? null;
    }
}
