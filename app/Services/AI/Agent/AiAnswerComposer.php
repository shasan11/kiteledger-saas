<?php

namespace App\Services\AI\Agent;

use App\Services\AI\AiProviderManager;
use Throwable;

/**
 * Composes the natural-language answer for RAG / semantic-search replies
 * (spec §17). The answer is grounded STRICTLY on the retrieved source snippets;
 * it never invents records or financial figures. If the provider is briefly
 * unavailable, a deterministic fallback summary of the cited sources is used.
 */
class AiAnswerComposer
{
    public const SYSTEM_PROMPT = <<<'PROMPT'
You are KiteLedger AI Assistant. You help users search, understand, and summarize ERP data.
Use ONLY the provided source snippets. Do not invent records, names, dates, or financial numbers.
For exact figures, tell the user to open the cited record. Cite sources by their number like [1].
If the snippets do not answer the question, say so plainly and suggest a refined search.
Keep answers short, direct, and business-focused.
PROMPT;

    public function __construct(private readonly AiProviderManager $provider) {}

    /**
     * @param  array<int, array<string, mixed>>  $sources
     */
    public function composeFromSources(string $query, array $sources): string
    {
        if ($sources === []) {
            return 'I could not find any records matching that. Try different keywords, or open the relevant module directly.';
        }

        $numbered = collect($sources)
            ->map(fn ($s, $i) => ($i + 1).'. ['.($s['module'] ?? 'Record').'] '.($s['title'] ?? '').' — '.($s['snippet'] ?? ''))
            ->implode("\n");

        try {
            $response = $this->provider->chat([
                ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                ['role' => 'user', 'content' => "Question: {$query}\n\nSources:\n{$numbered}"],
            ], ['max_tokens' => 220, 'temperature' => 0.1, 'timeout' => 30]);

            $text = trim((string) ($response['text'] ?? ''));
            if ($text !== '') {
                return $text;
            }
        } catch (Throwable) {
            // fall through to deterministic summary
        }

        return $this->fallbackSummary($sources);
    }

    /**
     * @param  array<int, array<string, mixed>>  $sources
     */
    private function fallbackSummary(array $sources): string
    {
        $count = count($sources);
        $lead = "I found {$count} related record".($count === 1 ? '' : 's').'. Open any of them for exact figures:';
        $lines = collect($sources)
            ->take(5)
            ->map(fn ($s) => '• '.($s['title'] ?? 'Record').(($s['metadata']['status'] ?? null) ? ' ('.$s['metadata']['status'].')' : ''))
            ->implode("\n");

        return $lead."\n".$lines;
    }
}
