<?php

namespace App\Services\AI\Rag;

use App\Models\AiEmbedding;
use App\Services\AI\AiProviderManager;

/**
 * Retrieval side of the RAG slice. Embeds the query, then ranks stored vectors
 * by cosine similarity in PHP — no external vector DB, works on plain MySQL.
 * Returns the matching SOURCE records (with snippets) so the caller can cite
 * them; it never invents figures.
 */
class AiSemanticSearchService
{
    public function __construct(private readonly AiProviderManager $provider) {}

    /**
     * @return array<int, array{source_type: string, source_id: string, snippet: string, score: float}>
     */
    public function search(string $query, array $opts = []): array
    {
        $vector = $this->provider->embedOne(trim($query));

        return $this->searchByVector($vector, $opts);
    }

    /**
     * Provider-independent ranking — given a query vector, return the top matches.
     *
     * @param  array<int, float>  $vector
     * @return array<int, array{source_type: string, source_id: string, snippet: string, score: float}>
     */
    public function searchByVector(array $vector, array $opts = []): array
    {
        $dims = count($vector);
        if ($dims === 0) {
            return [];
        }

        $limit = max(1, min(20, (int) ($opts['limit'] ?? 5)));
        $branchId = $opts['branch_id'] ?? null;
        $minScore = (float) ($opts['min_score'] ?? 0.0);

        $query = AiEmbedding::query()->where('dims', $dims);

        if ($branchId) {
            $query->where(function ($w) use ($branchId) {
                $w->where('branch_id', (string) $branchId)->orWhereNull('branch_id');
            });
        }

        $scored = [];

        $query->chunk(200, function ($rows) use ($vector, &$scored, $minScore) {
            foreach ($rows as $row) {
                $score = self::cosine($vector, $row->vector ?? []);
                if ($score > $minScore) {
                    $scored[] = ['score' => $score, 'row' => $row];
                }
            }
        });

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_map(fn ($s) => [
            'source_type' => $s['row']->source_type,
            'source_id' => $s['row']->source_id,
            'snippet' => (string) $s['row']->content,
            'score' => round($s['score'], 4),
        ], array_slice($scored, 0, $limit));
    }

    /**
     * Cosine similarity of two equal-length vectors.
     *
     * @param  array<int, float>  $a
     * @param  array<int, float>  $b
     */
    public static function cosine(array $a, array $b): float
    {
        $n = min(count($a), count($b));
        if ($n === 0) {
            return 0.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0; $i < $n; $i++) {
            $x = (float) $a[$i];
            $y = (float) $b[$i];
            $dot += $x * $y;
            $normA += $x * $x;
            $normB += $y * $y;
        }

        if ($normA <= 0.0 || $normB <= 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($normA) * sqrt($normB));
    }
}
