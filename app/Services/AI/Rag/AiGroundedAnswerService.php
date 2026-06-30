<?php

namespace App\Services\AI\Rag;

use App\Services\AI\AiProviderManager;
use Illuminate\Support\Str;
use Throwable;

class AiGroundedAnswerService
{
    public function __construct(private AiProviderManager $provider) {}

    public function answer(string $question, array $retrieval): array
    {
        $confidence = $retrieval['confidence'];
        $sources = $retrieval['sources'];
        $intent = $retrieval['understanding']['intent'] ?? 'general_erp_concept';

        if ($confidence['level'] === 'low' || $sources === []) {
            return [
                'headline' => 'I need a little more context to answer reliably.',
                'body' => 'I could not find enough relevant KiteLedger knowledge or business records for this question. Try including a document number, customer name, module, status, or date range.',
                'bullets' => [],
                'limitations' => ['No sufficiently reliable indexed source matched your question.'],
                'followups' => $this->followups($intent),
                'confidence' => 'low',
                'confidence_label' => $confidence['label'],
            ];
        }

        $prompt = <<<'PROMPT'
Answer the user's question using only the supplied KiteLedger context. Return JSON only with:
headline (one direct sentence), body (short explanation), bullets (0-5 factual points), limitations (0-2 items), followups (2-3 useful questions).
Never invent totals, balances, statuses, routes, names, or dates. Never output UUIDs, database IDs, SQL, provider/model names, source IDs, embedding details, or technical debugging. For app-help questions, give the actual KiteLedger menu/path from context. If exact totals are unavailable, recommend the relevant report instead of estimating.
PROMPT;

        try {
            $response = $this->provider->chat([
                ['role' => 'system', 'content' => $prompt],
                ['role' => 'user', 'content' => "Question: {$question}\nIntent: {$intent}\n\nKiteLedger context:\n".$retrieval['context']['text']],
            ], ['max_tokens' => 650, 'temperature' => 0.05]);
            $parsed = $this->parse((string) ($response['text'] ?? ''));
            if ($parsed) {
                return $this->clean($parsed, $confidence, $intent);
            }
        } catch (Throwable) {
            // A deterministic, source-backed response remains available.
        }

        $lead = $sources[0];

        return [
            'headline' => (string) ($lead['label'] ?? 'Here is what I found in KiteLedger.'),
            'body' => (string) ($lead['snippet'] ?? 'Relevant KiteLedger information was found.'),
            'bullets' => collect(array_slice($sources, 1, 4))->pluck('label')->values()->all(),
            'limitations' => [],
            'followups' => $this->followups($intent),
            'confidence' => $confidence['level'],
            'confidence_label' => $confidence['label'],
        ];
    }

    private function parse(string $text): ?array
    {
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($text));
        $decoded = json_decode((string) $text, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function clean(array $answer, array $confidence, string $intent): array
    {
        $sanitize = fn ($value) => $this->removeTechnical((string) $value);

        return [
            'headline' => $sanitize($answer['headline'] ?? 'Here is what I found.'),
            'body' => $sanitize($answer['body'] ?? ''),
            'bullets' => collect($answer['bullets'] ?? [])->take(5)->map($sanitize)->filter()->values()->all(),
            'limitations' => collect($answer['limitations'] ?? [])->take(2)->map($sanitize)->filter()->values()->all(),
            'followups' => collect($answer['followups'] ?? $this->followups($intent))->take(3)->map($sanitize)->filter()->values()->all(),
            'confidence' => $confidence['level'],
            'confidence_label' => $confidence['label'],
        ];
    }

    private function removeTechnical(string $text): string
    {
        $text = preg_replace('/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i', '[record]', $text);
        $text = preg_replace('/\b(provider|embedding|source_public_id|database id|model id)\s*[:=]\s*\S+/i', '', (string) $text);

        return trim(Str::squish((string) $text));
    }

    private function followups(string $intent): array
    {
        return match ($intent) {
            'app_help' => ['Which permission is required?', 'Where can I find this menu?', 'What should I do next?'],
            'report_question' => ['Which report should I open?', 'What filters should I use?', 'Can you explain the key figures?'],
            default => ['Can you narrow this by date?', 'Should I filter by branch or status?', 'Which related records should I review?'],
        };
    }
}
