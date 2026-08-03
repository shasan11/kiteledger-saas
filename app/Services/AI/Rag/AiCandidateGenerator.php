<?php

namespace App\Services\AI\Rag;

use App\Models\AiKnowledgeChunk;
use App\Models\User;
use App\Services\AI\Copilot\Knowledge\KnowledgeSourceClass;
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
                'fiscal_year_id' => $filters['fiscal_year_id'] ?? null,
                'model' => $filters['embedding_model'] ?? null,
                'min_score' => 0.05,
            ]) as $hit) {
                $candidate = $this->fromVectorHit($hit, $user, $filters);
                if (! $candidate) {
                    continue;
                }
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

    /**
     * Fail closed.
     *
     * Chunks that carry no permission requirement are public by construction.
     * But a chunk that DOES require a permission must never be released when
     * there is no user to check it against — previously a null user was treated
     * as fully authorized, so any unauthenticated retrieval path saw everything.
     */
    private function permitted(?User $user, ?string $permission): bool
    {
        if (! $permission) {
            return true;
        }

        if (! $user) {
            return false;
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

    private function fromVectorHit(array $hit, ?User $user, array $filters): ?array
    {
        if ($hit['source_type'] === 'knowledge') {
            $chunk = AiKnowledgeChunk::query()->find($hit['source_id']);
            if ($chunk) {
                $branchId = $filters['branch_id'] ?? $user?->branch_id;
                $fiscalYearId = $filters['fiscal_year_id'] ?? null;
                if (! $this->permitted($user, $chunk->permission)
                    || ($branchId && $chunk->branch_id && (string) $chunk->branch_id !== (string) $branchId)
                    || ($fiscalYearId && $chunk->fiscal_year_id && (string) $chunk->fiscal_year_id !== (string) $fiscalYearId)) {
                    return null;
                }
                $candidate = $this->fromChunk($chunk, 0, 0);
                $candidate['vector_score'] = (float) $hit['score'];

                return $candidate;
            }
        }

        // Business-record vector hits previously came back with permission=null,
        // which meant the vector path handed back invoices, contacts and
        // products without any authorization check at all. Resolve the required
        // permission for the source type and enforce it; an unmapped type is
        // treated as unauthorized rather than public.
        $sourceType = (string) $hit['source_type'];

        if (KnowledgeSourceClass::isUnmappedBusinessRecord($sourceType)) {
            return null;
        }

        $permission = KnowledgeSourceClass::permissionForBusinessRecord($sourceType);

        if (! $this->permitted($user, $permission)) {
            return null;
        }

        return [
            'source_type' => $sourceType, 'source_id' => $hit['source_id'],
            'source_key' => $hit['source_id'], 'module' => Str::headline($sourceType),
            'title' => Str::headline($sourceType), 'content' => $hit['snippet'],
            'route' => null, 'permission' => $permission, 'metadata' => [],
            'branch_id' => null, 'fiscal_year_id' => null, 'created_at' => null,
            'exact_match_score' => 0.0, 'keyword_score' => 0.0,
            'vector_score' => (float) $hit['score'], 'permission_score' => 1.0,
        ];
    }
}
