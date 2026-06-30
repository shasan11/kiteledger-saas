<?php

namespace App\Services\AI\Rag;

use Carbon\Carbon;
use Throwable;

class AiRanker
{
    /** @return array<int,array<string,mixed>> */
    public function rank(array $candidates, array $query, array $understanding): array
    {
        $ranked = [];
        foreach ($candidates as $candidate) {
            if (($candidate['permission_score'] ?? 0) <= 0) {
                continue;
            }

            $metadataScore = $this->metadataScore($candidate, $understanding);
            $recencyScore = $this->recencyScore($candidate, $understanding);
            $quality = $this->qualityScore($candidate);
            $weights = $this->weights($understanding);
            $score =
                ($candidate['exact_match_score'] ?? 0) * $weights['exact'] +
                ($candidate['keyword_score'] ?? 0) * $weights['keyword'] +
                ($candidate['vector_score'] ?? 0) * $weights['vector'] +
                $metadataScore * $weights['metadata'] +
                $recencyScore * $weights['recency'] +
                $quality * $weights['quality'];

            $candidate['metadata_score'] = $metadataScore;
            $candidate['recency_score'] = $recencyScore;
            $candidate['source_quality_score'] = $quality;
            $candidate['final_score'] = round(min(1, max(0, $score)), 4);
            $ranked[] = $candidate;
        }

        usort($ranked, fn ($a, $b) => $b['final_score'] <=> $a['final_score']);

        return $ranked;
    }

    private function weights(array $understanding): array
    {
        if ($understanding['exact_lookup']) {
            return ['exact' => .52, 'keyword' => .16, 'vector' => .12, 'metadata' => .10, 'recency' => .03, 'quality' => .07];
        }
        if ($understanding['prefer_app_knowledge']) {
            return ['exact' => .25, 'keyword' => .28, 'vector' => .20, 'metadata' => .10, 'recency' => .02, 'quality' => .15];
        }

        return ['exact' => .30, 'keyword' => .20, 'vector' => .25, 'metadata' => .10, 'recency' => .05, 'quality' => .10];
    }

    private function metadataScore(array $candidate, array $understanding): float
    {
        $score = 0.35;
        if ($understanding['module'] && strcasecmp((string) $candidate['module'], $understanding['module']) === 0) {
            $score += .35;
        }
        $status = $candidate['metadata']['status'] ?? null;
        if ($understanding['status'] && $status && strcasecmp((string) $status, $understanding['status']) === 0) {
            $score += .30;
        }

        return min(1, $score);
    }

    private function recencyScore(array $candidate, array $understanding): float
    {
        if (! $understanding['recent']) {
            return .5;
        }
        $date = $candidate['metadata']['date'] ?? $candidate['created_at'] ?? null;
        try {
            $days = $date ? Carbon::parse($date)->diffInDays(now()) : 365;

            return max(0, 1 - min(365, $days) / 365);
        } catch (Throwable) {
            return 0;
        }
    }

    private function qualityScore(array $candidate): float
    {
        return match ($candidate['source_type'] ?? '') {
            'app_help', 'route', 'report', 'workflow', 'documentation' => 1.0,
            'invoice', 'purchase_bill', 'journal_voucher', 'contact', 'product' => .9,
            default => .75,
        };
    }
}
