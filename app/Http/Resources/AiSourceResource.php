<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A single RAG citation/source card. Wraps a plain array produced by
 * AiRagRetriever (not an Eloquent model). Exposes only the public-facing fields
 * the spec defines (title/module/snippet/score/route) — never raw vectors,
 * embeddings, content hashes, or internal numeric ids.
 */
class AiSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $source = (array) $this->resource;

        return [
            'title' => $source['title'] ?? null,
            'module' => $source['module'] ?? null,
            'source_type' => $source['source_type'] ?? null,
            'source_public_id' => $source['source_public_id'] ?? null,
            'snippet' => $source['snippet'] ?? null,
            'score' => $source['score'] ?? null,
            'metadata' => [
                'display_number' => $source['metadata']['display_number'] ?? null,
                'status' => $source['metadata']['status'] ?? null,
                'date' => $source['metadata']['date'] ?? null,
                'route' => $source['metadata']['route'] ?? null,
            ],
        ];
    }
}
