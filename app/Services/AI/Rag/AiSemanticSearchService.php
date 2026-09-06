<?php

namespace App\Services\AI\Rag;

use App\Models\AiEmbedding;
use App\Neuron\VectorStore\MySqlVectorStore;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Retrieval side of the RAG slice. Embeds the query, then ranks stored vectors
 * by cosine similarity in PHP — no external vector DB, works on plain MySQL.
 * Returns the matching SOURCE records (with snippets) so the caller can cite
 * them; it never invents figures.
 *
 * Candidate selection is deliberately not ordered by recency. Taking the most
 * recently updated N embeddings makes older documentation permanently invisible
 * to semantic search however well it matches — "how do I create a purchase
 * bill?" would miss the help article written a year ago and surface last
 * week's invoice notes instead. The pool is chosen by relevance and coverage
 * instead, and when the corpus fits the budget it is scored in full.
 */
class AiSemanticSearchService
{
    public function __construct(
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
    ) {}

    /**
     * @return array<int, array{source_type: string, source_id: string, snippet: string, score: float}>
     */
    public function search(string $query, array $opts = []): array
    {
        $query = trim($query);
        $vector = $this->provider->embedOne($query);

        // The query text lets the candidate pool be built by relevance rather
        // than by an arbitrary ordering when the corpus is too large to scan.
        return $this->searchByVector($vector, $opts + ['query_text' => $query]);
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
        $minScore = (float) ($opts['min_score'] ?? 0.0);

        $query = $this->eligible($vector, $opts);

        $cap = max(50, min(
            $this->settings->ragMaxCandidatePool(),
            (int) ($opts['candidate_pool'] ?? $this->settings->ragCandidatePool()),
        ));

        $scored = [];

        $score = function ($rows) use ($vector, &$scored, $minScore): void {
            foreach ($rows as $row) {
                $similarity = self::cosine($vector, $row->vector ?? []);

                if ($similarity > $minScore) {
                    $scored[] = ['score' => $similarity, 'row' => $row];
                }
            }
        };

        // A corpus that fits the budget is scored in full: there is no reason to
        // sample when everything can be compared, and any sampling rule is a
        // source of silent misses.
        if ((clone $query)->count() <= $cap) {
            (clone $query)->chunkById(200, $score);
        } else {
            $score($this->boundedPool($query, $cap, (string) ($opts['query_text'] ?? '')));
        }

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_map(fn ($s) => [
            'source_type' => $s['row']->source_type,
            'source_id' => $s['row']->source_id,
            'snippet' => (string) $s['row']->content,
            'score' => round($s['score'], 4),
        ], array_slice($scored, 0, $limit));
    }

    /**
     * Embeddings this request is allowed to compare against.
     *
     * @param  array<int, float>  $vector
     * @param  array<string, mixed>  $opts
     */
    private function eligible(array $vector, array $opts): Builder
    {
        $query = AiEmbedding::query()->where('dims', count($vector));

        $query->where('model', $opts['model'] ?? $this->settings->embeddingModel())
            ->where('provider', $opts['provider'] ?? $this->settings->embeddingProvider());

        if (! empty($opts['source_types'])) {
            $query->whereIn('source_type', (array) $opts['source_types']);
        }

        if ($branchId = ($opts['branch_id'] ?? null)) {
            $query->where(function ($w) use ($branchId) {
                $w->where('branch_id', (string) $branchId)->orWhereNull('branch_id');
            });
        }

        if ($fiscalYearId = ($opts['fiscal_year_id'] ?? null)) {
            $query->where(function ($embeddingQuery) use ($fiscalYearId): void {
                $embeddingQuery->where('source_type', '!=', 'knowledge')
                    ->orWhereHas('knowledgeChunk', fn ($chunkQuery) => $chunkQuery
                        ->where(fn ($scope) => $scope
                            ->whereNull('fiscal_year_id')
                            ->orWhere('fiscal_year_id', (string) $fiscalYearId)));
            });
        }

        return $query;
    }

    /**
     * Builds a candidate pool for a corpus too large to score in full.
     *
     * Two parts, in priority order:
     *
     *  1. Rows whose stored text mentions the query's own terms. A lexical hit
     *     is a strong prior for a semantic one, and it is the part that keeps
     *     old-but-relevant documentation reachable.
     *  2. A deterministic spread over the remaining rows, ordered by primary
     *     key rather than by update time, so coverage is stable between runs
     *     and does not drift toward whatever was edited most recently.
     *
     * @return \Illuminate\Support\Collection<int, AiEmbedding>
     */
    private function boundedPool(Builder $query, int $cap, string $queryText): \Illuminate\Support\Collection
    {
        $terms = $this->terms($queryText);
        $pool = collect();

        if ($terms !== []) {
            $pool = (clone $query)
                ->where(function (Builder $builder) use ($terms): void {
                    foreach ($terms as $term) {
                        $builder->orWhere('content', 'like', '%'.$term.'%');
                    }
                })
                ->limit($cap)
                ->get();
        }

        $remaining = $cap - $pool->count();

        if ($remaining > 0) {
            $filler = (clone $query)
                ->when(
                    $pool->isNotEmpty(),
                    fn (Builder $builder) => $builder->whereNotIn('id', $pool->pluck('id')->all()),
                )
                ->orderBy('id')
                ->limit($remaining)
                ->get();

            $pool = $pool->concat($filler);
        }

        return $pool;
    }

    /**
     * Query terms worth a lexical prefilter.
     *
     * Short tokens match almost everything and would fill the pool with noise,
     * so they are dropped; a query made only of short words falls through to
     * the deterministic spread.
     *
     * @return string[]
     */
    private function terms(string $queryText): array
    {
        $tokens = preg_split('/[^\p{L}\p{N}_-]+/u', Str::lower($queryText), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $terms = array_values(array_filter(
            $tokens,
            static fn (string $token): bool => mb_strlen($token) >= 4,
        ));

        return array_slice(array_unique($terms), 0, 8);
    }

    /**
     * Cosine similarity of two equal-length vectors.
     *
     * @param  array<int, float>  $a
     * @param  array<int, float>  $b
     */
    public static function cosine(array $a, array $b): float
    {
        return MySqlVectorStore::cosineSimilarity($a, $b);
    }
}
