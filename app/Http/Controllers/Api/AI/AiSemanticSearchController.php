<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Rag\AiSemanticSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * RAG semantic search over accounting TEXT (invoice notes, journal narrations).
 * Returns cited source records; an optional LLM summary is grounded strictly on
 * those snippets and forbidden from inventing figures.
 */
class AiSemanticSearchController extends Controller
{
    public function __construct(
        private readonly AiSemanticSearchService $search,
        private readonly AiPermissionService $permissions,
        private readonly AiSettingsService $settings,
        private readonly AiProviderManager $provider,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->permissions->canSemanticSearch($user)) {
            return response()->json(['ok' => false, 'message' => 'You do not have access to AI search.'], 403);
        }

        $data = $request->validate([
            'query' => ['required', 'string', 'max:500'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        if (! $this->settings->enabled() || ! $this->settings->supportsEmbeddings()) {
            return response()->json([
                'ok' => false,
                'message' => 'Semantic search needs an embeddings-capable AI provider (OpenAI, Gemini, Ollama, or OpenRouter). Configure it in AI Settings, then run "php artisan ai:index".',
            ], 422);
        }

        try {
            $results = $this->search->search($data['query'], [
                'limit' => $data['limit'] ?? 5,
                'branch_id' => $user?->branch_id,
            ]);
        } catch (AiProviderException $e) {
            return response()->json(['ok' => false, 'code' => $e->getErrorCode(), 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'ok' => true,
            'query' => $data['query'],
            'results' => $results,
            'summary' => $this->summarize($data['query'], $results),
            'note' => 'Matches are retrieved from your own records by meaning. Open a record for exact figures — amounts are never generated.',
        ]);
    }

    /**
     * Best-effort plain-language summary, grounded ONLY on the retrieved
     * snippets. Returns null if there is nothing to summarize or AI is briefly
     * unavailable — the cited results are the source of truth either way.
     *
     * @param  array<int, array{snippet: string}>  $results
     */
    private function summarize(string $query, array $results): ?string
    {
        if ($results === []) {
            return null;
        }

        $context = collect($results)->map(fn ($r, $i) => ($i + 1).'. '.$r['snippet'])->implode("\n");

        try {
            $response = $this->provider->chat([
                ['role' => 'system', 'content' => 'You help search business records. Answer ONLY from the numbered snippets provided. Do not invent amounts, dates, names, or facts not present. If the snippets do not answer the question, say so. Cite snippet numbers like [1].'],
                ['role' => 'user', 'content' => "Question: {$query}\n\nSnippets:\n{$context}"],
            ], ['max_tokens' => 200, 'temperature' => 0.1, 'timeout' => 30]);

            return trim((string) ($response['text'] ?? '')) ?: null;
        } catch (Throwable) {
            return null;
        }
    }
}
