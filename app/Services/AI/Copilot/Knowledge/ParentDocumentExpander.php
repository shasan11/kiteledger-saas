<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Knowledge;

use App\Models\AiKnowledgeChunk;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Widens narrow chunk matches with their sibling chunks.
 *
 * A chunk boundary can cut a procedure in half, so retrieval finds "step 3 of
 * creating an invoice" without the surrounding steps and the answer reads as
 * incomplete. When a match is short, neighbouring chunks from the same source
 * document are pulled in to restore context.
 *
 * Expansion never widens authorization: siblings inherit the parent's permission
 * and are re-checked, and only chunks the retrieval scope already allowed are
 * considered.
 */
final class ParentDocumentExpander
{
    /** Below this length a chunk is considered too narrow to stand alone. */
    private const NARROW_CHUNK_CHARS = 400;

    /** Hard cap so expansion cannot blow the context budget. */
    private const MAX_SIBLINGS_PER_SOURCE = 3;

    /**
     * @param array<int, array<string, mixed>> $candidates
     * @param callable(?string): bool $permits receives a permission name, returns whether the user holds it
     * @return array{candidates: array<int, array<string, mixed>>, expanded: int}
     */
    public function expand(array $candidates, callable $permits): array
    {
        $expandedCount = 0;
        $seen = [];

        foreach ($candidates as $candidate) {
            $seen[$this->keyFor($candidate)] = true;
        }

        $additions = [];

        foreach ($candidates as $candidate) {
            $content = (string) ($candidate['content'] ?? '');

            if (mb_strlen($content) >= self::NARROW_CHUNK_CHARS) {
                continue;
            }

            $sourceKey = (string) ($candidate['source_key'] ?? '');

            // Only application knowledge is expanded. A business-record chunk
            // has no meaningful "rest of the document", and pulling siblings
            // would widen exposure for no benefit.
            if ($sourceKey === '' || KnowledgeSourceClass::classify($candidate['source_type'] ?? null) === KnowledgeSourceClass::BusinessRecord) {
                continue;
            }

            foreach ($this->siblingsOf($candidate, $sourceKey) as $sibling) {
                if (! $permits($sibling->permission)) {
                    continue;
                }

                $siblingCandidate = $this->toCandidate($sibling, $candidate);
                $key = $this->keyFor($siblingCandidate);

                if (isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;
                $additions[] = $siblingCandidate;
                $expandedCount++;
            }
        }

        return [
            'candidates' => array_merge($candidates, $additions),
            'expanded' => $expandedCount,
        ];
    }

    /** @return iterable<AiKnowledgeChunk> */
    private function siblingsOf(array $candidate, string $sourceKey): iterable
    {
        // Sibling chunks share the source document prefix, e.g. "doc:invoicing".
        $prefix = str_contains($sourceKey, '#')
            ? strstr($sourceKey, '#', true)
            : $sourceKey;

        if (! is_string($prefix) || $prefix === '') {
            return [];
        }

        try {
            return AiKnowledgeChunk::query()
                ->where('source_id', 'like', $prefix.'%')
                ->when(
                    isset($candidate['branch_id']) && $candidate['branch_id'] !== null,
                    fn ($q) => $q->where(fn ($inner) => $inner
                        ->whereNull('branch_id')
                        ->orWhere('branch_id', $candidate['branch_id'])),
                )
                ->limit(self::MAX_SIBLINGS_PER_SOURCE)
                ->get();
        } catch (Throwable $e) {
            // Expansion is an enhancement; its failure must not lose the
            // original results, but it should still be visible.
            Log::warning('Parent-document expansion failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    private function toCandidate(AiKnowledgeChunk $chunk, array $parent): array
    {
        return [
            'source_type' => $chunk->source_type,
            'source_id' => (string) $chunk->id,
            'source_key' => $chunk->source_id,
            'module' => $chunk->module,
            'title' => $chunk->title,
            'content' => $chunk->content,
            'route' => $chunk->route,
            'permission' => $chunk->permission,
            'metadata' => $chunk->metadata ?? [],
            'branch_id' => $chunk->branch_id,
            'fiscal_year_id' => $chunk->fiscal_year_id,
            'created_at' => $chunk->created_at?->toIso8601String(),
            'exact_match_score' => 0.0,
            'keyword_score' => 0.0,
            'vector_score' => 0.0,
            'permission_score' => 1.0,
            // Inherits the parent's relevance: it earned inclusion by context,
            // not by matching the query itself.
            'final_score' => (float) ($parent['final_score'] ?? $parent['vector_score'] ?? 0.0),
            'expanded_from_parent' => true,
        ];
    }

    private function keyFor(array $candidate): string
    {
        $key = trim((string) ($candidate['source_key'] ?? ''));

        return $key !== ''
            ? ($candidate['source_type'] ?? '').':'.$key
            : 'content:'.md5(trim((string) ($candidate['content'] ?? '')));
    }
}
