<?php

namespace App\Services\AI\Rag;

use App\Models\AiKnowledgeChunk;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Throwable;

class AiCandidateGenerator
{
    public function __construct(private AiSemanticSearchService $semantic) {}

    /** @return array<int,array<string,mixed>> */
    public function generate(?User $user, array $query, array $understanding, array $filters = []): array
    {
        $candidates = $this->keywordCandidates($user, $query, $filters);

        try {
            foreach ($this->semantic->search($query['original'], [
                'limit' => 30,
                'branch_id' => $filters['branch_id'] ?? $user?->branch_id,
                'model' => $filters['embedding_model'] ?? null,
                'min_score' => 0.05,
            ]) as $hit) {
                $candidate = $this->fromVectorHit($hit);
                $key = $candidate['source_type'].':'.$candidate['source_id'];
                if (isset($candidates[$key])) {
                    $candidates[$key]['vector_score'] = max($candidates[$key]['vector_score'], (float) $hit['score']);
                } else {
                    $candidates[$key] = $candidate;
                }
            }
        } catch (Throwable) {
            // Exact and keyword retrieval are the shared-hosting baseline.
        }

        return array_values($candidates);
    }

    /** @return array<string,array<string,mixed>> */
    private function keywordCandidates(?User $user, array $query, array $filters): array
    {
        $base = AiKnowledgeChunk::query();
        $this->scope($base, $user, $filters);
        $rows = collect();

        try {
            if ($query['normalized'] !== '') {
                $rows = (clone $base)
                    ->whereRaw('MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)', [$query['normalized']])
                    ->limit(80)->get();
            }
        } catch (Throwable) {
            $rows = collect();
        }

        if ($rows->isEmpty()) {
            $tokens = array_slice($query['tokens'], 0, 7);
            $rows = (clone $base)->where(function (Builder $builder) use ($tokens, $query): void {
                foreach ($tokens as $token) {
                    $builder->orWhere('title', 'like', "%{$token}%")
                        ->orWhere('content', 'like', "%{$token}%");
                }
                foreach ($query['identifiers'] as $identifier) {
                    $builder->orWhere('title', 'like', "%{$identifier}%")
                        ->orWhere('content', 'like', "%{$identifier}%");
                }
            })->limit(100)->get();
        }

        $out = [];
        foreach ($rows as $row) {
            if (! $this->permitted($user, $row->permission)) {
                continue;
            }
            $haystack = Str::lower(Str::ascii($row->title.' '.$row->content.' '.implode(' ', $row->keywords ?? [])));
            $matches = collect($query['tokens'])->filter(fn ($token) => str_contains($haystack, $token))->count();
            $keyword = count($query['tokens']) ? min(1, $matches / max(1, count($query['tokens']))) : 0;
            $exact = collect($query['identifiers'])->contains(fn ($id) => str_contains($haystack, Str::lower($id))) ? 1.0 : 0.0;
            if ($exact === 0.0 && str_contains($haystack, $query['normalized'])) {
                $exact = 0.85;
            }

            $candidate = $this->fromChunk($row, $exact, $keyword);
            $out[$candidate['source_type'].':'.$candidate['source_id']] = $candidate;
        }

        return $out;
    }

    private function scope(Builder $query, ?User $user, array $filters): void
    {
        $branchId = $filters['branch_id'] ?? $user?->branch_id;
        if ($branchId) {
            $query->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', (string) $branchId));
        }
        if ($fiscal = ($filters['fiscal_year_id'] ?? null)) {
            $query->where(fn ($q) => $q->whereNull('fiscal_year_id')->orWhere('fiscal_year_id', (string) $fiscal));
        }
    }

    private function permitted(?User $user, ?string $permission): bool
    {
        if (! $permission || ! $user) {
            return true;
        }
        try {
            return $user->can($permission) || $user->hasPermissionTo($permission);
        } catch (Throwable) {
            return false;
        }
    }

    private function fromChunk(AiKnowledgeChunk $row, float $exact, float $keyword): array
    {
        return [
            'source_type' => $row->source_type,
            'source_id' => (string) $row->id,
            'source_key' => $row->source_id,
            'module' => $row->module,
            'title' => $row->title,
            'content' => $row->content,
            'route' => $row->route,
            'permission' => $row->permission,
            'metadata' => $row->metadata ?? [],
            'branch_id' => $row->branch_id,
            'fiscal_year_id' => $row->fiscal_year_id,
            'created_at' => $row->created_at?->toIso8601String(),
            'exact_match_score' => $exact,
            'keyword_score' => $keyword,
            'vector_score' => 0.0,
            'permission_score' => 1.0,
        ];
    }

    private function fromVectorHit(array $hit): array
    {
        if ($hit['source_type'] === 'knowledge') {
            $chunk = AiKnowledgeChunk::query()->find($hit['source_id']);
            if ($chunk) {
                $candidate = $this->fromChunk($chunk, 0, 0);
                $candidate['vector_score'] = (float) $hit['score'];

                return $candidate;
            }
        }

        return [
            'source_type' => $hit['source_type'], 'source_id' => $hit['source_id'],
            'source_key' => $hit['source_id'], 'module' => Str::headline($hit['source_type']),
            'title' => Str::headline($hit['source_type']), 'content' => $hit['snippet'],
            'route' => null, 'permission' => null, 'metadata' => [],
            'branch_id' => null, 'fiscal_year_id' => null, 'created_at' => null,
            'exact_match_score' => 0.0, 'keyword_score' => 0.0,
            'vector_score' => (float) $hit['score'], 'permission_score' => 1.0,
        ];
    }
}
