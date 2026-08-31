<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Knowledge;

/**
 * Reciprocal Rank Fusion for hybrid retrieval.
 *
 * Keyword scores and vector similarities live on incompatible scales, so
 * blending them numerically produces a value nobody can reason about. RRF uses
 * only each candidate's *rank* within its own list:
 *
 *     score = sum over lists of  1 / (k + rank)
 *
 * That is scale-free, needs no tuning per source, and is explainable: a result
 * ranked highly by both retrievers beats one that only a single retriever liked.
 */
final class ReciprocalRankFusion
{
    /**
     * Damping constant. 60 is the value from the original Cormack et al. paper
     * and keeps a strong second-place result competitive with a weak first.
     */
    private const K = 60;

    /**
     * Fuses ranked candidate lists into one ordering.
     *
     * @param array<string, array<int, array<string, mixed>>> $rankedLists keyed by retriever name
     * @return array<int, array<string, mixed>>
     */
    public function fuse(array $rankedLists, int $k = self::K): array
    {
        $scores = [];
        $items = [];
        $contributions = [];

        foreach ($rankedLists as $listName => $candidates) {
            $rank = 0;

            foreach ($candidates as $candidate) {
                $rank++;
                $key = $this->keyFor($candidate);

                $increment = 1 / ($k + $rank);

                $scores[$key] = ($scores[$key] ?? 0.0) + $increment;
                $items[$key] ??= $candidate;
                $contributions[$key][$listName] = $rank;
            }
        }

        arsort($scores);

        $fused = [];

        foreach ($scores as $key => $score) {
            $candidate = $items[$key];
            $candidate['rrf_score'] = round($score, 6);
            $candidate['rrf_ranks'] = $contributions[$key];

            // Agreement across retrievers is itself a quality signal worth
            // surfacing to the trace.
            $candidate['retriever_agreement'] = count($contributions[$key]);

            $fused[] = $candidate;
        }

        return $fused;
    }

    private function keyFor(array $candidate): string
    {
        $sourceKey = trim((string) ($candidate['source_key'] ?? ''));

        if ($sourceKey !== '') {
            return ($candidate['source_type'] ?? '').':'.$sourceKey;
        }

        return 'content:'.md5(trim((string) ($candidate['content'] ?? '')));
    }
}
