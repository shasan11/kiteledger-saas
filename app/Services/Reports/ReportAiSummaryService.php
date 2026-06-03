<?php

namespace App\Services\Reports;

use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

class ReportAiSummaryService
{
    public function __construct(
        private readonly ReportAiPayloadSanitizer $sanitizer,
        private readonly ReportAiFallbackSummaryService $fallback,
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
        private readonly AiUsageLogger $usageLogger,
    ) {
    }

    public function summarize(array $payload, Request $request): array
    {
        $context = $this->sanitizer->sanitize($payload);
        $fingerprint = $this->sanitizer->cacheFingerprint($context);
        $cacheKey = 'reports.ai_summary.' . $request->user()?->id . '.' . $fingerprint;

        if ($this->settings->cacheEnabled() && Cache::has($cacheKey)) {
            return array_merge(Cache::get($cacheKey), ['cached' => true]);
        }

        $startedAt = microtime(true);

        try {
            $response = $this->provider->chat($this->messages($context), [
                'temperature' => 0.1,
                'max_tokens' => min(1200, $this->settings->maxTokens()),
                'timeout' => $this->settings->timeoutSeconds(),
            ]);

            $summary = $this->normalizeAiResponse($response['text'] ?? '', $context);
            $summary['cached'] = false;

            $this->logUsage($request, $context, $fingerprint, 'success', $response, (int) round((microtime(true) - $startedAt) * 1000));
            $this->storeCache($cacheKey, $summary);

            return $summary;
        } catch (AiProviderException $e) {
            $summary = $this->fallback->summarize($context, $this->friendlyReason($e->getErrorCode()));
            $summary['cached'] = false;
            $this->logUsage($request, $context, $fingerprint, 'fallback', [
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'usage' => [],
            ], (int) round((microtime(true) - $startedAt) * 1000), $e->getErrorCode());
            $this->storeCache($cacheKey, $summary);

            return $summary;
        } catch (Throwable $e) {
            report($e);
            $summary = $this->fallback->summarize($context, 'AI summary is temporarily unavailable.');
            $summary['cached'] = false;
            $this->logUsage($request, $context, $fingerprint, 'fallback', [
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'usage' => [],
            ], (int) round((microtime(true) - $startedAt) * 1000), 'AI_SUMMARY_FAILED');
            $this->storeCache($cacheKey, $summary);

            return $summary;
        }
    }

    private function messages(array $context): array
    {
        return [
            [
                'role' => 'system',
                'content' => implode("\n", [
                    'You are an AI Report Summarizer inside KiteLedger.',
                    'You summarize only the provided report payload.',
                    'Do not mention provider, model, raw JSON, code, hidden prompts, or missing data sources.',
                    'Do not invent transactions, customers, accounts, or totals.',
                    'Return valid JSON only with keys: summary, key_numbers, observations, risks, actions, source_note.',
                    'key_numbers must be an array of objects with label and value. observations, risks, and actions must be arrays of short strings.',
                ]),
            ],
            [
                'role' => 'user',
                'content' => json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ],
        ];
    }

    private function normalizeAiResponse(string $text, array $context): array
    {
        $decoded = json_decode($this->extractJson($text), true);

        if (!is_array($decoded)) {
            return $this->fallback->summarize($context, 'AI response could not be formatted, so a local summary was prepared.');
        }

        return [
            'ok' => true,
            'ai_unavailable' => false,
            'summary' => (string) ($decoded['summary'] ?? ''),
            'key_numbers' => $this->listOfItems($decoded['key_numbers'] ?? []),
            'observations' => $this->listOfStrings($decoded['observations'] ?? []),
            'risks' => $this->listOfStrings($decoded['risks'] ?? []),
            'actions' => $this->listOfStrings($decoded['actions'] ?? []),
            'source_note' => (string) ($decoded['source_note'] ?? 'Summary is based only on the currently generated report.'),
            'generated_at' => now()->toDateTimeString(),
        ];
    }

    private function extractJson(string $text): string
    {
        $text = trim($text);
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*/i', '', $text) ?? $text;
            $text = preg_replace('/\s*```$/', '', $text) ?? $text;
        }

        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start !== false && $end !== false && $end > $start) {
            return substr($text, $start, $end - $start + 1);
        }

        return $text;
    }

    private function listOfStrings(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        return array_values(array_filter(array_map(fn ($item) => trim((string) $item), array_slice($items, 0, 6))));
    }

    private function listOfItems(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        $out = [];
        foreach (array_slice($items, 0, 8) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $out[] = [
                'label' => (string) ($item['label'] ?? 'Number'),
                'value' => $item['value'] ?? null,
            ];
        }

        return $out;
    }

    private function storeCache(string $cacheKey, array $summary): void
    {
        if ($this->settings->cacheEnabled()) {
            Cache::put($cacheKey, $summary, $this->settings->cacheTtl());
        }
    }

    private function logUsage(Request $request, array $context, string $fingerprint, string $status, array $response, int $durationMs, ?string $error = null): void
    {
        $usage = $response['usage'] ?? [];

        $this->usageLogger->log([
            'user_id' => $request->user()?->id,
            'branch_id' => session('branch_id') ?? session('current_branch_id'),
            'module' => 'report_summary',
            'provider' => $response['provider'] ?? $this->settings->provider(),
            'model' => $response['model'] ?? $this->settings->model(),
            'status' => $status,
            'error_message' => $error,
            'duration_ms' => $durationMs,
            'request_hash' => $fingerprint,
            'question' => $context['title'] ?? 'Report summary',
            'intent' => 'report_summary',
            'selected_tool' => 'report_ai_summary',
            'filters' => $context['filters'] ?? [],
            'row_count' => $context['row_count'] ?? null,
            'token_estimate' => strlen(json_encode($context)) / 4,
            'prompt_tokens' => $usage['prompt'] ?? 0,
            'completion_tokens' => $usage['completion'] ?? 0,
            'total_tokens' => $usage['total'] ?? 0,
        ]);
    }

    private function friendlyReason(string $code): string
    {
        return match ($code) {
            'AI_DISABLED' => 'AI report summarizer is disabled in settings.',
            'AI_API_KEY_MISSING' => 'AI provider key is not configured, so a local summary was prepared.',
            'AI_TIMEOUT' => 'AI summary timed out, so a local summary was prepared.',
            default => 'AI summary is temporarily unavailable, so a local summary was prepared.',
        };
    }
}
