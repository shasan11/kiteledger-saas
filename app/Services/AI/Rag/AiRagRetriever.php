<?php

namespace App\Services\AI\Rag;

use App\Models\User;
use App\Services\AI\AiSettingsService;

/** Backward-compatible facade over the production hybrid retrieval pipeline. */
class AiRagRetriever
{
    public function __construct(
        private AiHybridRetriever $hybrid,
        private AiSettingsService $settings,
    ) {}

    public function available(): bool
    {
        // Exact and keyword RAG work without an embeddings provider.
        return $this->settings->enabled();
    }

    public function retrieve(?User $user, string $query, array $filters = []): array
    {
        return $this->hybrid->retrieve($user, $query, $filters)['sources'];
    }

    public function retrieveWithContext(?User $user, string $query, array $filters = []): array
    {
        return $this->hybrid->retrieve($user, $query, $filters);
    }
}
