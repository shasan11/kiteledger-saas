<?php

declare(strict_types=1);

namespace App\Services\Reports\Intelligence;

use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use App\Services\Reports\ReportRunner;
use App\Support\Money\CurrencyFormatter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Throwable;

/**
 * The one service that produces an AI summary of a report.
 *
 * Replaces two competing implementations that both took the browser's word for
 * what the report contained: ReportAiSummaryService (via
 * ReportAiSummaryController) and AiAssistantController::reportSummary. Both
 * accepted `rows`, `totals` and `row_count` from the client and fed them
 * straight to the model, so a modified request could change what the AI
 * reported as the company's financial position.
 *
 * Here the client supplies only *what to look at* — category, report key,
 * filters. The server resolves the report, authorizes it, executes it through
 * the canonical report engine, computes the statistics itself, and lets the
 * model do nothing but explain verified figures.
 */
final class ReportIntelligenceService
{
    public function __construct(
        private readonly ReportRunner $runner,
        private readonly ReportInsightEngine $insights,
        private readonly AiProviderManager $provider,
        private readonly AiSettingsService $settings,
        private readonly AiUsageLogger $usageLogger,
        private readonly CurrencyFormatter $currency,
    ) {}

    /**
     * @param  array<string, mixed>  $filters  client-supplied report filters
     * @return array<string, mixed>
     */
    public function summarize(Request $request, string $category, string $reportKey, array $filters = []): array
    {
        $meta = $this->runner->resolve($category, $reportKey);

        if (! $meta) {
            throw new InvalidArgumentException('Report not found.');
        }

        if (! $this->runner->authorizes($request, $meta)) {
            throw new ReportAccessDeniedException('You do not have permission to view this report.');
        }

        $report = $this->runner->run($request, $category, $reportKey, $filters);

        $analytics = $this->insights->analyze($report, $this->scopeFor($report, $meta));

        if ($analytics->isEmpty()) {
            throw new InvalidArgumentException('This report returned no data to summarize for the selected filters.');
        }

        // The fingerprint covers the executed report, not the request: two
        // users with the same permitted scope and identical data get the same
        // answer, and any change in the underlying figures invalidates it.
        $fingerprint = hash('sha256', json_encode([
            $category,
            $reportKey,
            $analytics->toArray(),
        ], JSON_UNESCAPED_SLASHES));

        $cacheKey = 'reports.ai_summary.v2.'.$request->user()?->id.'.'.$fingerprint;

        if ($this->settings->cacheEnabled() && ($cached = Cache::get($cacheKey))) {
            $cached['cached'] = true;
            $cached['meta']['cached'] = true;

            return $cached;
        }

        $startedAt = microtime(true);

        try {
            $response = $this->provider->chat($this->messages($analytics), [
                'temperature' => 0.1,
                'max_tokens' => min(1200, $this->settings->maxTokens()),
                'timeout' => $this->settings->timeoutSeconds(),
            ]);
        } catch (AiProviderException $e) {
            $this->logUsage($request, $analytics, $fingerprint, 'error', [], $startedAt, $e->getErrorCode());

            throw $e;
        } catch (Throwable $e) {
            report($e);
            $this->logUsage($request, $analytics, $fingerprint, 'error', [], $startedAt, 'AI_SUMMARY_FAILED');

            throw new AiProviderException('Unable to generate summary right now. Please try again.', 'AI_SUMMARY_FAILED');
        }

        $result = $this->compose($analytics, (string) ($response['text'] ?? ''));

        $this->logUsage($request, $analytics, $fingerprint, 'success', $response, $startedAt);

        if ($this->settings->cacheEnabled()) {
            Cache::put($cacheKey, $result, $this->settings->cacheTtl());
        }

        return $result;
    }

    /**
     * The canonical output contract.
     *
     * `key_numbers` is read back from the deterministic analytics, never from
     * the model's prose — that is the difference between a figure the user can
     * act on and a plausible-looking sentence. The model contributes narrative
     * only.
     *
     * @return array<string, mixed>
     */
    private function compose(ReportAnalytics $analytics, string $text): array
    {
        $narrative = $this->parseNarrative($text);

        // `formatted` was rendered by the insight engine in the tenant's
        // currency, so the drawer, the legacy envelope and the model's prompt
        // all quote the same string.
        $keyNumbers = array_map(
            static fn (array $number): array => [
                'label' => $number['label'],
                'value' => $number['value'],
                'currency' => $number['currency'],
                'measure' => $number['measure'] ?? 'money',
                'formatted' => $number['formatted'],
                'verified' => true,
            ],
            $analytics->keyNumbers,
        );

        $risks = array_merge(
            array_map(
                static fn (array $anomaly): string => $anomaly['message'],
                array_filter($analytics->anomalies, static fn (array $a): bool => $a['severity'] !== 'info'),
            ),
            $narrative['risks'],
        );

        $payload = [
            'executive_summary' => $narrative['executive_summary'],
            'key_numbers' => $keyNumbers,
            'trends' => $narrative['trends'],
            'risks' => array_values(array_slice(array_unique($risks), 0, 8)),
            'recommended_actions' => $narrative['recommended_actions'],
            'data_scope' => $analytics->scope,
            'currency' => $this->currency->base()->toArray(),
            'analytics' => $analytics->toArray(),
            'generated_at' => now()->toIso8601String(),
            'cached' => false,
            'disclaimer' => 'Figures are calculated from your KiteLedger data. The written commentary is AI-generated and should be reviewed before business decisions.',
        ];

        // Legacy envelope kept alongside the canonical one so an older client
        // bundle still renders while the frontend rolls forward.
        $payload['summary'] = [
            'executive_summary' => $payload['executive_summary'],
            'key_numbers' => array_map(
                static fn (array $number): string => $number['label'].': '.$number['formatted'],
                $keyNumbers,
            ),
            'trends' => $payload['trends'],
            'risks' => $payload['risks'],
            'recommended_actions' => $payload['recommended_actions'],
            'disclaimer' => $payload['disclaimer'],
        ];

        $payload['meta'] = [
            'report_key' => $analytics->reportKey,
            'report_title' => $analytics->reportTitle,
            'generated_at' => $payload['generated_at'],
            'row_count' => $analytics->rowCount,
            // The server analyzed every row; nothing was sampled away before
            // the statistics were computed.
            'sampled_row_count' => $analytics->rowCount,
            'cached' => false,
        ];

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function messages(ReportAnalytics $analytics): array
    {
        $system = <<<'PROMPT'
You are a senior ERP reporting analyst writing for an SME business owner.

You are given a VERIFIED analytics package that the KiteLedger server calculated from the company's own database. Your job is to explain it, not to compute it.

Rules:
1. Never state a number that is not present in the analytics package. Do not add, subtract, average or project figures yourself.
2. Do not invent customers, suppliers, invoices, accounts, dates, branches or trends.
3. Only describe a trend if the package contains evidence for it. If there is no comparison data, say the report covers a single period rather than implying a movement.
4. Every recommended action must follow from a specific figure or anomaly in the package. Do not write generic advice such as "continue to monitor performance".
5. Be specific and short. Prefer "Receivables over 60 days are 31% of the outstanding total, concentrated in three customers" over a paragraph of commentary.
6. Do not expose internal IDs, database structure or technical metadata.
7. Write money exactly as the package's "formatted" value shows it, including the currency symbol and decimals. Never restate an amount as a bare number and never convert currencies.
8. Return JSON only, with no surrounding prose or code fences.
PROMPT;

        $shape = [
            'executive_summary' => 'string, 2-4 sentences',
            'trends' => ['string'],
            'risks' => ['string'],
            'recommended_actions' => ['string'],
        ];

        return [
            ['role' => 'system', 'content' => $system],
            [
                'role' => 'user',
                'content' => "Verified analytics package:\n"
                    .json_encode($analytics->toPromptContext(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                    ."\n\nReturn JSON in this exact shape:\n"
                    .json_encode($shape, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            ],
        ];
    }

    /**
     * @return array{executive_summary: string, trends: string[], risks: string[], recommended_actions: string[]}
     */
    private function parseNarrative(string $text): array
    {
        $decoded = json_decode($this->extractJson($text), true);

        if (! is_array($decoded)) {
            Log::warning('AI report summary returned unreadable JSON.', ['response_length' => strlen($text)]);

            return [
                // The verified numbers are still returned to the user, so an
                // unreadable narrative degrades the answer rather than losing it.
                'executive_summary' => Str::limit(trim(strip_tags($text)), 2000, '')
                    ?: 'The verified figures below were calculated from your data, but the written commentary could not be generated.',
                'trends' => [],
                'risks' => [],
                'recommended_actions' => [],
            ];
        }

        return [
            'executive_summary' => Str::limit($this->stringValue($decoded['executive_summary'] ?? ''), 2000, ''),
            'trends' => $this->listOfStrings($decoded['trends'] ?? []),
            'risks' => $this->listOfStrings($decoded['risks'] ?? []),
            'recommended_actions' => $this->listOfStrings($decoded['recommended_actions'] ?? []),
        ];
    }

    /**
     * @param  array<string, mixed>  $report
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private function scopeFor(array $report, array $meta): array
    {
        $filters = $report['filters'] ?? [];

        return array_filter([
            // Most reports do not declare a currency of their own; they are run
            // in the tenant's base currency, so say so rather than leaving the
            // figures unlabelled.
            'currency' => $report['currency']['code'] ?? $this->currency->base()->code,
            'branch' => ($filters['branch_id'] ?? null) === 'all'
                ? 'All permitted branches'
                : ($report['branch_name'] ?? null),
            'fiscal_year' => $report['fiscal_year']['name'] ?? null,
            'date_range' => array_filter([
                'from' => $report['period']['from'] ?? null,
                'to' => $report['period']['to'] ?? null,
            ]),
            'report_category' => $meta['category_label'] ?? null,
            'generated_at' => $report['generated_at'] ?? null,
        ], static fn ($value) => $value !== null && $value !== [] && $value !== '');
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

    /** @return string[] */
    private function listOfStrings(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($item): string => Str::limit(trim(is_scalar($item) ? (string) $item : ''), 400, ''),
            array_slice($items, 0, 8),
        )));
    }

    private function stringValue(mixed $value): string
    {
        return is_scalar($value) ? trim((string) $value) : '';
    }

    /**
     * @param  array<string, mixed>  $response
     */
    private function logUsage(
        Request $request,
        ReportAnalytics $analytics,
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
                'question' => $analytics->reportTitle,
                'intent' => $analytics->reportKey,
                'selected_tool' => 'report_intelligence',
                'row_count' => $analytics->rowCount,
                'prompt_tokens' => $usage['prompt'] ?? 0,
                'completion_tokens' => $usage['completion'] ?? 0,
                'total_tokens' => $usage['total'] ?? 0,
            ]);
        } catch (Throwable $e) {
            Log::warning('Could not persist AI report-summary usage.', ['message' => $e->getMessage()]);
        }
    }
}
