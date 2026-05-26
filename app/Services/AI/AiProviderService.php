<?php

namespace App\Services\AI;

use App\Models\AiSetting;
use App\Models\AiUsageLog;
use Illuminate\Support\Facades\Auth;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Enums\Provider as PrismProvider;
use Throwable;

class AiProviderService
{
    protected AiSetting $settings;
    protected AiUsageLogger $logger;

    public function __construct(AiUsageLogger $logger)
    {
        $this->settings = AiSetting::current();
        $this->logger   = $logger;
    }

    /**
     * Send a text prompt and return a normalised response array.
     */
    public function text(
        string $module,
        string $systemPrompt,
        string $userPrompt,
        array  $context = [],
        ?string $branchId = null
    ): array {
        $this->checkUsageLimits();

        // Lift PHP execution time limit for slow/local providers (e.g. Ollama).
        // The Prism HTTP timeout (config prism.request_timeout) is the real cap.
        $phpTimeout = (int) config('prism.request_timeout', 120) + 30;
        set_time_limit($phpTimeout);

        $startMs  = (int) round(microtime(true) * 1000);
        $provider = $this->resolveProvider();
        $model    = $this->resolveModel();
        $apiKey   = $this->resolveApiKey();
        $baseUrl  = $this->resolveBaseUrl();

        try {
            $request = Prism::text()
                ->using($provider, $model, $this->buildProviderConfig($apiKey, $baseUrl))
                ->withSystemPrompt($systemPrompt)
                ->withPrompt($userPrompt)
                ->withMaxTokens($this->settings->max_tokens ?? 1200)
                ->usingTemperature($this->settings->temperature ?? 0.2);

            $response = $request->asText();

            $durationMs = (int) round(microtime(true) * 1000) - $startMs;

            $this->logger->log([
                'user_id'           => optional(Auth::user())->id,
                'branch_id'         => $branchId,
                'module'            => $module,
                'provider'          => $this->settings->provider,
                'model'             => $model,
                'prompt_tokens'     => $response->usage->promptTokens,
                'completion_tokens' => $response->usage->completionTokens,
                'total_tokens'      => $response->usage->promptTokens + $response->usage->completionTokens,
                'status'            => 'success',
                'duration_ms'       => $durationMs,
            ]);

            return [
                'success'  => true,
                'provider' => $this->settings->provider,
                'model'    => $model,
                'text'     => $response->text,
                'data'     => [],
                'tokens'   => [
                    'prompt'     => $response->usage->promptTokens,
                    'completion' => $response->usage->completionTokens,
                    'total'      => $response->usage->promptTokens + $response->usage->completionTokens,
                ],
            ];
        } catch (Throwable $e) {
            // Attempt fallback provider if configured
            if ($this->settings->fallback_provider) {
                return $this->textWithFallback($module, $systemPrompt, $userPrompt, $branchId, $e);
            }

            $this->logger->logError($module, $this->settings->provider, $e->getMessage());

            throw $e;
        }
    }

    /**
     * Parse JSON from a text response (structured output via prompt engineering).
     */
    public function structured(
        string $module,
        string $systemPrompt,
        string $userPrompt,
        array  $context = [],
        ?string $branchId = null
    ): array {
        $fullPrompt = $userPrompt . "\n\nRespond with valid JSON only. No markdown fences, no explanation, just raw JSON.";

        $result = $this->text($module, $systemPrompt, $fullPrompt, $context, $branchId);

        // Strip markdown fences if any
        $raw = trim($result['text'] ?? '');
        $raw = preg_replace('/^```(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*```$/', '', $raw);

        $decoded = json_decode($raw, true);

        $result['data'] = is_array($decoded) ? $decoded : ['raw' => $raw];

        return $result;
    }

    /**
     * Test the configured provider connection.
     */
    public function testConnection(): array
    {
        set_time_limit((int) config('prism.request_timeout', 120) + 30);

        $provider = $this->resolveProvider();
        $model    = $this->resolveModel();
        $apiKey   = $this->resolveApiKey();
        $baseUrl  = $this->resolveBaseUrl();

        try {
            $response = Prism::text()
                ->using($provider, $model, $this->buildProviderConfig($apiKey, $baseUrl))
                ->withPrompt('Reply with the exact text: connection_ok')
                ->withMaxTokens(20)
                ->asText();

            return [
                'success'  => true,
                'provider' => $this->settings->provider,
                'model'    => $model,
                'response' => trim($response->text),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    private function textWithFallback(
        string     $module,
        string     $systemPrompt,
        string     $userPrompt,
        ?string    $branchId,
        Throwable  $primaryError
    ): array {
        $fallbackProvider = $this->settings->fallback_provider;
        $fallbackModel    = $this->settings->fallback_model ?? $this->settings->model;

        try {
            $response = Prism::text()
                ->using($fallbackProvider, $fallbackModel)
                ->withSystemPrompt($systemPrompt)
                ->withPrompt($userPrompt)
                ->withMaxTokens($this->settings->max_tokens ?? 1200)
                ->usingTemperature($this->settings->temperature ?? 0.2)
                ->asText();

            return [
                'success'  => true,
                'provider' => $fallbackProvider,
                'model'    => $fallbackModel,
                'text'     => $response->text,
                'data'     => [],
                'tokens'   => [
                    'prompt'     => $response->usage->promptTokens,
                    'completion' => $response->usage->completionTokens,
                    'total'      => $response->usage->promptTokens + $response->usage->completionTokens,
                ],
            ];
        } catch (Throwable $fallbackError) {
            $this->logger->logError($module, $fallbackProvider, $fallbackError->getMessage());
            throw $primaryError;
        }
    }

    private function resolveProvider(): string
    {
        return $this->settings->provider ?? config('ai.default_provider', 'openai');
    }

    private function resolveModel(): string
    {
        return $this->settings->model ?? config('ai.default_model', 'gpt-4o-mini');
    }

    private function resolveApiKey(): ?string
    {
        $key = $this->settings->getDecryptedApiKey();

        if (!$key) {
            $provider = $this->resolveProvider();
            $key = config("ai.providers.{$provider}.api_key");
        }

        return $key ?: null;
    }

    private function resolveBaseUrl(): ?string
    {
        if ($this->settings->base_url) {
            return $this->settings->base_url;
        }

        $provider = $this->resolveProvider();

        return config("ai.providers.{$provider}.base_url");
    }

    private function buildProviderConfig(?string $apiKey, ?string $baseUrl): array
    {
        $config = [];

        if ($apiKey) {
            $config['api_key'] = $apiKey;
        }

        if ($baseUrl) {
            $config['base_url'] = $baseUrl;
        }

        return $config;
    }

    private function checkUsageLimits(): void
    {
        $settings = $this->settings;

        if ($settings->daily_request_limit) {
            $todayCount = AiUsageLog::where('status', 'success')
                ->whereDate('created_at', now()->toDateString())
                ->count();

            if ($todayCount >= $settings->daily_request_limit) {
                abort(429, 'AI usage limit reached for today.');
            }
        }

        if ($settings->monthly_token_limit) {
            $monthTotal = AiUsageLog::where('status', 'success')
                ->whereYear('created_at', now()->year)
                ->whereMonth('created_at', now()->month)
                ->sum('total_tokens');

            if ($monthTotal >= $settings->monthly_token_limit) {
                abort(429, 'AI monthly token limit reached.');
            }
        }
    }
}
