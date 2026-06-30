<?php

namespace App\Services\AI\Rag;

use App\Models\User;

class AiHybridRetriever
{
    public function __construct(
        private AiQueryNormalizer $normalizer,
        private AiQueryUnderstandingService $understanding,
        private AiCandidateGenerator $generator,
        private AiRanker $ranker,
        private AiReranker $reranker,
        private AiContextAssembler $context,
        private AiConfidenceService $confidence,
        private AiSourceSanitizer $sanitizer,
    ) {}

    public function retrieve(?User $user, string $question, array $filters = []): array
    {
        $started = microtime(true);
        $query = $this->normalizer->normalize($question);
        $understanding = $this->understanding->understand($query, $filters['context_payload'] ?? []);

        if (! $understanding['use_retrieval']) {
            return [
                'query' => $query, 'understanding' => $understanding, 'candidates' => [],
                'context' => ['text' => '', 'source_count' => 0, 'characters' => 0],
                'sources' => [], 'confidence' => $this->confidence->evaluate([]),
                'duration_ms' => (int) round((microtime(true) - $started) * 1000),
            ];
        }

        $candidates = $this->generator->generate($user, $query, $understanding, $filters);
        $ranked = $this->ranker->rank($candidates, $query, $understanding);
        $reranked = $this->reranker->rerank($ranked, $understanding, $understanding['broad_summary'] ? 10 : 7);

        return [
            'query' => $query,
            'understanding' => $understanding,
            'candidates' => $reranked,
            'context' => $this->context->assemble($reranked),
            'sources' => $this->sanitizer->sanitize($reranked),
            'confidence' => $this->confidence->evaluate($reranked),
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
        ];
    }
}
