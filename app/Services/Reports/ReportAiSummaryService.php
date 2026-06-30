<?php

namespace App\Services\Reports;

use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Throwable;

class ReportAiSummaryService
{
    public function __construct(
        private readonly ReportAiPayloadSanitizer $sanitizer,
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
        private readonly AiUsageLogger $usageLogger,
    ) {}

    public function summarize(array $payload, Request $request): array
    {
        $context = $this->sanitizer->sanitize($payload);

        if ($this->hasNoBusinessData($context)) {
            throw new InvalidArgumentException('No report data available to summarize.');
        }

        $fingerprint = $this->sanitizer->cacheFingerprint($context);
        $cacheKey = 'reports.ai_summary.'.$request->user()?->id.'.'.$fingerprint;

        if ($this->settings->cacheEnabled() && Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            $cached['meta']['cached'] = true;

            return $cached;
        }

        $startedAt = microtime(true);

        try {
            $response = $this->provider->chat($this->messages($context), [
                'temperature' => 0.1,
                'max_tokens' => min(1200, $this->settings->maxTokens()),
                'timeout' => $this->settings->timeoutSeconds(),
            ]);

            $result = [
                'summary' => $this->normalizeAiResponse($response['text'] ?? '', $context),
                'meta' => [
                    'report_key' => $context['report_key'],
                    'report_title' => $context['report_title'],
                    'provider' => $response['provider'] ?? $this->settings->provider(),
                    'model' => $response['model'] ?? $this->settings->model(),
                    'generated_at' => now()->toIso8601String(),
                    'sampled_row_count' => $context['metadata']['sampled_row_count'],
                    'row_count' => $context['metadata']['row_count'],
                    'cached' => false,
                ],
            ];

            $this->logUsage($request, $context, $fingerprint, 'success', $response, $startedAt);

            if ($this->settings->cacheEnabled()) {
                Cache::put($cacheKey, $result, $this->settings->cacheTtl());
            }

            return $result;
        } catch (AiProviderException $e) {
            $this->logUsage($request, $context, $fingerprint, 'error', [], $startedAt, $e->getErrorCode());
            throw $e;
        } catch (Throwable $e) {
            report($e);
            $this->logUsage($request, $context, $fingerprint, 'error', [], $startedAt, 'AI_SUMMARY_FAILED');

            throw new AiProviderException('Unable to generate summary right now. Please try again.', 'AI_SUMMARY_FAILED');
        }
    }

    private function messages(array $context): array
    {
        $system = <<<'PROMPT'
You are a senior ERP reporting analyst. You analyze accounting, sales, purchase, inventory, tax, HR, CRM, and operational reports for SME businesses.

Rules:
1. Use only the data provided in the report payload.
2. Do not invent figures, customers, suppliers, invoices, accounts, dates, branches, or trends.
3. If the data is sampled or incomplete, clearly say that the summary is based on the available sample and totals.
4. Focus on useful business insight, not generic commentary.
5. Explain key numbers in plain business language.
6. Highlight risks, anomalies, unusual movements, or missing information.
7. Give practical recommended actions.
8. Keep the output concise but useful.
9. Do not expose internal IDs or technical metadata.
10. Return structured JSON only.
PROMPT;

        $shape = [
            'executive_summary' => 'string',
            'key_numbers' => ['string'],
            'trends' => ['string'],
            'risks' => ['string'],
            'recommended_actions' => ['string'],
            'disclaimer' => 'string',
        ];

        return [
            ['role' => 'system', 'content' => $system],
            [
                'role' => 'user',
                'content' => "Analyze this ERP report and produce a business summary.\n\nReport payload:\n"
                    .json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                    ."\n\nReturn JSON in this exact shape:\n"
                    .json_encode($shape, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            ],
        ];
    }

    private function normalizeAiResponse(string $text, array $context): array
    {
        $decoded = json_decode($this->extractJson($text), true);

        if (! is_array($decoded)) {
            Log::warning('AI report summary returned invalid JSON.', [
                'report_key' => $context['report_key'],
                'response_length' => strlen($text),
            ]);

            return [
                'executive_summary' => mb_substr(trim(strip_tags($text)), 0, 3000) ?: 'The provider returned an unreadable summary.',
                'key_numbers' => [],
                'trends' => [],
                'risks' => [],
                'recommended_actions' => [],
                'disclaimer' => 'This summary is AI-generated and should be reviewed before business decisions.',
            ];
        }

        return [
            'executive_summary' => $this->stringValue($decoded['executive_summary'] ?? ''),
            'key_numbers' => $this->listOfStrings($decoded['key_numbers'] ?? []),
            'trends' => $this->listOfStrings($decoded['trends'] ?? []),
            'risks' => $this->listOfStrings($decoded['risks'] ?? []),
            'recommended_actions' => $this->listOfStrings($decoded['recommended_actions'] ?? []),
            'disclaimer' => $this->stringValue($decoded['disclaimer'] ?? '')
                ?: 'This summary is AI-generated and should be reviewed before business decisions.',
        ];
    }

    private function extractJson(string $text): string
    {
        $text = trim($text);
        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        return $start !== false && $end !== false && $end > $start
            ? substr($text, $start, $end - $start + 1)
            : $text;
    }

    private function listOfStrings(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($item) => trim(is_scalar($item) ? (string) $item : ''),
            array_slice($items, 0, 8),
        )));
    }

    private function stringValue(mixed $value): string
    {
        return is_scalar($value) ? trim((string) $value) : '';
    }

    private function hasNoBusinessData(array $context): bool
    {
        return empty($context['rows'])
            && empty($context['totals'])
            && empty($context['summary_cards']);
    }

    private function logUsage(
        Request $request,
        array $context,
        string $fingerprint,
        string $status,
        array $response,
        float $startedAt,
        ?string $error = null,
    ): void {
        $usage = $response['usage'] ?? [];

        try {
            $this->usageLogger->log([
                'user_id' => $request->user()?->id,
                'branch_id' => session('branch_id') ?? session('current_branch_id'),
                'module' => 'report_summary',
                'provider' => $response['provider'] ?? $this->settings->provider(),
                'model' => $response['model'] ?? $this->settings->model(),
                'status' => $status,
                'error_message' => $error,
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                'request_hash' => $fingerprint,
                'question' => $context['report_title'],
                'intent' => $context['report_key'],
                'selected_tool' => 'report_ai_summary',
                'filters' => $context['filters'],
                'row_count' => $context['metadata']['row_count'],
                'token_estimate' => (int) ceil(strlen(json_encode($context)) / 4),
                'prompt_tokens' => $usage['prompt'] ?? 0,
                'completion_tokens' => $usage['completion'] ?? 0,
                'total_tokens' => $usage['total'] ?? 0,
            ]);
        } catch (Throwable $e) {
            Log::warning('Could not persist AI report-summary usage.', ['message' => $e->getMessage()]);
        }
    }
}
