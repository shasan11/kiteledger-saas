<?php

namespace App\Services\AI\Rag;

class AiReranker
{
    /** Rule-based diversity reranker; it never creates or changes facts. */
    public function rerank(array $ranked, array $understanding, int $limit = 8): array
    {
        $selected = [];
        $sourceCounts = [];

        foreach (array_slice($ranked, 0, 20) as $candidate) {
            $type = $candidate['source_type'] ?? 'other';
            $penalty = ($sourceCounts[$type] ?? 0) * ($understanding['broad_summary'] ? .06 : .025);
            if ($understanding['prefer_app_knowledge'] && in_array($type, ['app_help', 'route', 'report', 'workflow', 'documentation'], true)) {
                $candidate['final_score'] = min(1, $candidate['final_score'] + .12);
            }
            $candidate['final_score'] = max(0, $candidate['final_score'] - $penalty);
            $selected[] = $candidate;
            $sourceCounts[$type] = ($sourceCounts[$type] ?? 0) + 1;
        }

        usort($selected, fn ($a, $b) => $b['final_score'] <=> $a['final_score']);

        return array_slice($selected, 0, max(1, min(12, $limit)));
    }
}
