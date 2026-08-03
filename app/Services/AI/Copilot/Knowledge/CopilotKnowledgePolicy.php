<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Knowledge;

use App\Services\AI\Copilot\AnswerSourcePolicy;

/**
 * The RAG boundary.
 *
 * Decides whether retrieval may run for a given answer policy, and which
 * retrieved candidates are allowed to ground the answer. This is what stops an
 * indexed chunk from being presented as a current financial figure.
 */
final class CopilotKnowledgePolicy
{
    /**
     * Retrieval is refused outright for live-data questions.
     *
     * Not merely down-weighted: if the answer must be a current figure, there is
     * no amount of documentation that legitimately contributes to it, and
     * offering some risks the model blending stale text into the number.
     */
    public function allowsRetrieval(AnswerSourcePolicy $policy): bool
    {
        return $policy->allowsKnowledgeRetrieval();
    }

    /**
     * Filters ranked candidates down to admissible evidence.
     *
     * @param array<int, array<string, mixed>> $candidates
     * @return array{evidence: array<int, array<string, mixed>>, rejected: array<string, int>}
     */
    public function admit(array $candidates, AnswerSourcePolicy $policy): array
    {
        $rejected = [
            'live_policy' => 0,
            'below_threshold' => 0,
            'duplicate' => 0,
            'non_authoritative' => 0,
        ];

        if (! $this->allowsRetrieval($policy)) {
            $rejected['live_policy'] = count($candidates);

            return ['evidence' => [], 'rejected' => $rejected];
        }

        $seen = [];
        $evidence = [];

        foreach ($candidates as $candidate) {
            $class = KnowledgeSourceClass::classify($candidate['source_type'] ?? null);
            $score = $this->relevanceOf($candidate);

            if ($score < $class->minRelevanceScore()) {
                $rejected['below_threshold']++;
                continue;
            }

            // A live-required policy never reaches here, but a mixed-evidence
            // answer must still not treat a record snapshot as authoritative.
            if (! $class->isAuthoritative() && $policy === AnswerSourcePolicy::KnowledgeRetrievalAllowed) {
                $rejected['non_authoritative']++;
                continue;
            }

            $fingerprint = $this->fingerprint($candidate);

            if (isset($seen[$fingerprint])) {
                $rejected['duplicate']++;
                continue;
            }

            $seen[$fingerprint] = true;

            $candidate['source_class'] = $class->value;
            $candidate['authoritative'] = $class->isAuthoritative();
            $candidate['evidence_label'] = $class->evidenceLabel();
            $candidate['relevance'] = $score;

            $evidence[] = $candidate;
        }

        return ['evidence' => $evidence, 'rejected' => $rejected];
    }

    /**
     * Whether the admitted evidence is enough to ground an answer at all.
     * Below this, the honest response is "I could not find that", not a
     * confident-sounding paraphrase of weak matches.
     */
    public function hasSufficientEvidence(array $evidence): bool
    {
        return $evidence !== [];
    }

    /**
     * Combined relevance. Uses the strongest available signal rather than an
     * average, so a strong exact match is not diluted by a weak vector score.
     */
    private function relevanceOf(array $candidate): float
    {
        return max(
            (float) ($candidate['final_score'] ?? 0.0),
            (float) ($candidate['rerank_score'] ?? 0.0),
            (float) ($candidate['exact_match_score'] ?? 0.0),
            (float) ($candidate['vector_score'] ?? 0.0),
            (float) ($candidate['keyword_score'] ?? 0.0),
        );
    }

    /** Dedup by source identity first, falling back to a content hash. */
    private function fingerprint(array $candidate): string
    {
        $key = trim((string) ($candidate['source_key'] ?? ''));

        if ($key !== '') {
            return ($candidate['source_type'] ?? '').':'.$key;
        }

        return 'content:'.md5(trim((string) ($candidate['content'] ?? '')));
    }
}
