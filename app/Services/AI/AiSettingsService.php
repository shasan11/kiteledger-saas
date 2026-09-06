<?php

namespace App\Services\AI;

use App\Services\AI\Providers\AiProviderCapabilityRegistry;
use App\Services\SaaS\PlatformSettingsService;

class AiSettingsService
{
    public const GROUP = 'ai';

    public const DEFAULTS = [
        'ai_enabled' => true,
        'ai_provider' => 'openai',
        'ai_model' => 'gpt-4o-mini',
        'ai_base_url' => 'https://api.openai.com/v1',
        'ai_temperature' => 0.2,
        'ai_max_tokens' => 500,
        'ai_timeout_seconds' => 180,
        'ai_connect_timeout_seconds' => 15,
        // Streaming is now genuine token streaming, and the client falls back to
        // the plain JSON endpoint by itself when a proxy or host blocks it, so
        // it is safe to have on by default.
        'ai_stream_enabled' => true,
        'ai_cache_enabled' => true,
        'ai_cache_ttl' => 600,
        'ai_context_max_rows' => 15,
        'ai_context_max_chars' => 5000,
        'ai_fast_mode' => true,
        // Platform-managed Copilot defaults. Tenant users cannot edit these.
        'ai_default_financial_date_scope' => 'current_fiscal_year',
        'ai_allow_developer_details' => false,
        'ai_financial_assistant_enabled' => false,
        'ai_document_assistant_enabled' => false,
        'ai_document_scanning_enabled' => true,
        'ai_document_provider' => '',
        'ai_document_model' => '',
        'ai_write_actions_enabled' => false,
        'ai_action_execution_enabled' => false,
        'ai_fallback_provider' => '',
        'ai_assistant_mode' => 'full',
        'ai_copilot_enabled' => true,
        'ai_copilot_engine' => 'neuron',
        'ai_copilot_read_only' => false,
        'ai_embedding_provider' => 'openai',
        'ai_embedding_model' => 'text-embedding-3-small',
        'ai_embedding_dimensions' => null,
        'ai_rag_top_k' => 8,
        'ai_rag_candidate_pool' => 800,
        'ai_rag_max_candidate_pool' => 2000,
        'ai_rag_min_vector_score' => 0.05,
        'ai_rag_context_max_chars' => 12000,
    ];

    public function __construct(protected PlatformSettingsService $platform) {}

    private function value(string $key, mixed $default = null): mixed
    {
        return $this->platform->get(self::GROUP.'.'.$key, $default);
    }

    public function enabled(): bool
    {
        return filter_var($this->value('ai_enabled', self::DEFAULTS['ai_enabled']), FILTER_VALIDATE_BOOL);
    }

    public function provider(): string
    {
        $p = strtolower((string) $this->value('ai_provider', self::DEFAULTS['ai_provider']));

        return $p ?: self::DEFAULTS['ai_provider'];
    }

    public function model(): string
    {
        $m = (string) $this->value('ai_model', '');
        if ($m) {
            return $m;
        }

        return $this->defaultModelFor($this->provider());
    }

    public function apiKey(): ?string
    {
        $raw = (string) $this->value('ai_api_key', '');
        if (! $raw) {
            $provider = $this->provider();
            $cfg = config("ai.providers.{$provider}.api_key") ?: config("prism.providers.{$provider}.api_key");

            return $cfg ?: null;
        }

        return $raw;
    }

    public function hasApiKey(): bool
    {
        $key = $this->apiKey();

        return is_string($key) && trim($key) !== '';
    }

    public function apiKeyFor(string $provider): ?string
    {
        $provider = strtolower(trim($provider));
        if ($provider === $this->provider()) {
            return $this->apiKey();
        }

        $key = config("ai.providers.{$provider}.api_key")
            ?: config("prism.providers.{$provider}.api_key");

        return is_string($key) && trim($key) !== '' ? $key : null;
    }

    public function hasApiKeyFor(string $provider): bool
    {
        return strtolower(trim($provider)) === 'ollama' || filled($this->apiKeyFor($provider));
    }

    public function baseUrlFor(string $provider): string
    {
        $provider = strtolower(trim($provider));
        if ($provider === $this->provider()) {
            return $this->baseUrl();
        }

        return rtrim((string) (config("ai.providers.{$provider}.base_url")
            ?: config("prism.providers.{$provider}.url")
            ?: $this->defaultBaseUrlFor($provider)), '/');
    }

    public function maskedApiKey(): ?string
    {
        $key = $this->apiKey();
        if (! $key) {
            return null;
        }
        $len = mb_strlen($key);
        if ($len <= 8) {
            return str_repeat('*', $len);
        }

        return mb_substr($key, 0, 4).'...'.mb_substr($key, -4);
    }

    public function baseUrl(): string
    {
        $url = (string) $this->value('ai_base_url', '');
        if ($url) {
            return rtrim($url, '/');
        }

        return $this->defaultBaseUrlFor($this->provider());
    }

    public function temperature(): float
    {
        return (float) $this->value('ai_temperature', self::DEFAULTS['ai_temperature']);
    }

    public function maxTokens(): int
    {
        return max(50, min(32000, (int) $this->value('ai_max_tokens', self::DEFAULTS['ai_max_tokens'])));
    }

    public function savedTimeoutSeconds(): int
    {
        return max(5, min(600, (int) $this->value('ai_timeout_seconds', self::DEFAULTS['ai_timeout_seconds'])));
    }

    public function timeoutSeconds(): int
    {
        $saved = $this->savedTimeoutSeconds();

        return max($this->minimumRuntimeTimeoutForProvider($this->provider()), $saved);
    }

    /**
     * Latency budget for a request a person is waiting on (a Copilot chat turn
     * or its routing call), as opposed to queued work such as document
     * extraction or knowledge indexing.
     *
     * timeoutSeconds() is floored at two to three minutes because document and
     * indexing calls genuinely need it; applying that same floor to a chat box
     * means a user can sit in front of a spinner for minutes before learning
     * the provider is unreachable. This budget is always the shorter of the two
     * and never exceeds the configured global timeout, so lowering the global
     * setting still lowers the interactive one.
     *
     * Locally hosted models are slower by nature, so they keep a higher floor
     * rather than being cut off mid-generation.
     */
    public function interactiveTimeoutSeconds(): int
    {
        $configured = (int) config('ai.copilot.interactive_timeout_seconds', 45);
        $floor = $this->provider() === 'ollama' ? 90 : 20;

        return min(
            $this->timeoutSeconds(),
            max($floor, min(300, $configured)),
        );
    }

    public function savedConnectTimeoutSeconds(): int
    {
        return max(2, min(60, (int) $this->value('ai_connect_timeout_seconds', self::DEFAULTS['ai_connect_timeout_seconds'])));
    }

    public function connectTimeoutSeconds(): int
    {
        return max(10, $this->savedConnectTimeoutSeconds());
    }

    public function streamEnabled(): bool
    {
        return filter_var($this->value('ai_stream_enabled', self::DEFAULTS['ai_stream_enabled']), FILTER_VALIDATE_BOOL);
    }

    public function cacheEnabled(): bool
    {
        return filter_var($this->value('ai_cache_enabled', self::DEFAULTS['ai_cache_enabled']), FILTER_VALIDATE_BOOL);
    }

    public function cacheTtl(): int
    {
        return max(30, (int) $this->value('ai_cache_ttl', self::DEFAULTS['ai_cache_ttl']));
    }

    public function contextMaxRows(): int
    {
        return max(1, min(500, (int) $this->value('ai_context_max_rows', self::DEFAULTS['ai_context_max_rows'])));
    }

    public function reportSummaryMaxRows(): int
    {
        return max(1, min(100, (int) $this->value('ai_context_max_rows', self::DEFAULTS['ai_context_max_rows'])));
    }

    public function contextMaxChars(): int
    {
        return max(500, min(200000, (int) $this->value('ai_context_max_chars', self::DEFAULTS['ai_context_max_chars'])));
    }

    public function fastMode(): bool
    {
        return filter_var($this->value('ai_fast_mode', self::DEFAULTS['ai_fast_mode']), FILTER_VALIDATE_BOOL);
    }

    public function financialAssistantEnabled(): bool
    {
        return filter_var($this->value('ai_financial_assistant_enabled', self::DEFAULTS['ai_financial_assistant_enabled']), FILTER_VALIDATE_BOOL);
    }

    public function documentScanningEnabled(): bool
    {
        return filter_var(
            $this->value('ai_document_scanning_enabled', config('documents.ai_scan_enabled', true)),
            FILTER_VALIDATE_BOOL,
        );
    }

    public function documentProvider(): string
    {
        return strtolower(trim((string) (config('documents.ai_provider')
            ?: $this->value('ai_document_provider', '')
            ?: $this->provider())));
    }

    public function documentModel(): string
    {
        return trim((string) (config('documents.ai_model')
            ?: $this->value('ai_document_model', '')
            ?: $this->model()));
    }

    public function writeActionsEnabled(): bool
    {
        if ($this->copilotReadOnly()) {
            return false;
        }

        return filter_var($this->value('ai_write_actions_enabled', config('ai.copilot.write_actions_enabled', self::DEFAULTS['ai_write_actions_enabled'])), FILTER_VALIDATE_BOOL);
    }

    public function actionExecutionEnabled(): bool
    {
        return ! $this->copilotReadOnly()
            && filter_var($this->value('ai_action_execution_enabled', config('ai.copilot.action_execution_enabled', false)), FILTER_VALIDATE_BOOL);
    }

    public function incrementalIndexingEnabled(): bool
    {
        return filter_var(config('ai.copilot.incremental_indexing_enabled', true), FILTER_VALIDATE_BOOL);
    }

    public function ragEnabled(): bool
    {
        return $this->copilotEnabled()
            && filter_var($this->value('ai_rag_enabled', config('ai.copilot.rag_enabled', true)), FILTER_VALIDATE_BOOL);
    }

    public function financialToolsEnabled(): bool
    {
        return $this->copilotEnabled()
            && filter_var($this->value('ai_financial_tools_enabled', config('ai.copilot.financial_tools_enabled', true)), FILTER_VALIDATE_BOOL);
    }

    public function assistantMode(): string
    {
        $mode = strtolower(trim((string) $this->value('ai_assistant_mode', self::DEFAULTS['ai_assistant_mode'])));

        return in_array($mode, ['full', 'reports_only'], true) ? $mode : 'full';
    }

    public function reportsOnly(): bool
    {
        return $this->assistantMode() === 'reports_only';
    }

    public function copilotEnabled(): bool
    {
        return filter_var($this->value('ai_copilot_enabled', config('ai.copilot.enabled', true)), FILTER_VALIDATE_BOOL);
    }

    /**
     * Copilot V2 orchestration. Database setting wins so a tenant can be moved
     * onto (or off) V2 without a deploy; config is the environment default.
     */
    public function copilotV2Enabled(): bool
    {
        return filter_var(
            $this->value('ai_copilot_v2_enabled', config('ai.copilot.v2_enabled', false)),
            FILTER_VALIDATE_BOOL
        );
    }

    public function copilotEngine(): string
    {
        $engine = strtolower(trim((string) $this->value('ai_copilot_engine', config('ai.copilot.engine', 'neuron'))));

        return in_array($engine, ['legacy', 'neuron'], true) ? $engine : 'neuron';
    }

    public function copilotReadOnly(): bool
    {
        return filter_var($this->value('ai_copilot_read_only', config('ai.copilot.read_only', true)), FILTER_VALIDATE_BOOL);
    }

    public function embeddingProvider(): string
    {
        return strtolower(trim((string) $this->value('ai_embedding_provider', config('ai.embedding.provider', $this->provider())))) ?: $this->provider();
    }

    public function embeddingDimensions(): ?int
    {
        $value = $this->value('ai_embedding_dimensions', config('ai.embedding.dimensions'));
        $dimensions = $value === null || $value === '' ? null : (int) $value;

        return $dimensions && $dimensions > 0 ? min(65535, $dimensions) : null;
    }

    public function embeddingApiKey(): ?string
    {
        if ($this->embeddingProvider() === $this->provider()) {
            return $this->apiKey();
        }

        $key = config('ai.providers.'.$this->embeddingProvider().'.api_key')
            ?: config('prism.providers.'.$this->embeddingProvider().'.api_key');

        return is_string($key) && trim($key) !== '' ? $key : null;
    }

    public function embeddingBaseUrl(): string
    {
        if ($this->embeddingProvider() === $this->provider()) {
            return $this->baseUrl();
        }

        return rtrim((string) (config('ai.providers.'.$this->embeddingProvider().'.base_url') ?: $this->defaultBaseUrlFor($this->embeddingProvider())), '/');
    }

    public function ragTopK(): int
    {
        return max(1, min(50, (int) $this->value('ai_rag_top_k', config('ai.rag.top_k', 8))));
    }

    public function ragCandidatePool(): int
    {
        return max(50, min($this->ragMaxCandidatePool(), (int) $this->value('ai_rag_candidate_pool', config('ai.rag.candidate_pool', 800))));
    }

    public function ragMaxCandidatePool(): int
    {
        return max(100, min(5000, (int) $this->value('ai_rag_max_candidate_pool', config('ai.rag.max_candidate_pool', 2000))));
    }

    public function ragMinimumVectorScore(): float
    {
        return max(-1.0, min(1.0, (float) $this->value('ai_rag_min_vector_score', config('ai.rag.min_vector_score', 0.05))));
    }

    public function ragContextMaxChars(): int
    {
        return max(1000, min(100000, (int) $this->value('ai_rag_context_max_chars', config('ai.rag.context_max_chars', 12000))));
    }

    public function setApiKey(string $key): void
    {
        $this->platform->set(self::GROUP, self::GROUP.'.ai_api_key', $key, 'string', true);
    }

    public function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            if ($value === null) {
                continue;
            }
            $type = is_bool($value) ? 'boolean' : (is_int($value) ? 'integer' : (is_float($value) ? 'decimal' : 'string'));
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            $this->platform->set(self::GROUP, self::GROUP.'.'.$key, $value, $type);
        }
    }

    public function health(): array
    {
        return [
            'enabled' => $this->enabled(),
            'provider' => $this->provider(),
            'model' => $this->model(),
            'base_url' => $this->baseUrl(),
            'has_api_key' => $this->hasApiKey(),
            'stream_enabled' => $this->streamEnabled(),
            'cache_enabled' => $this->cacheEnabled(),
            'fast_mode' => $this->fastMode(),
            'copilot_enabled' => $this->copilotEnabled(),
            'copilot_v2_enabled' => $this->copilotV2Enabled(),
            'copilot_engine' => $this->copilotEngine(),
            'embedding_provider' => $this->embeddingProvider(),
            'embedding_model' => $this->embeddingModel(),
            'runtime_timeout_seconds' => $this->timeoutSeconds(),
            'runtime_connect_timeout_seconds' => $this->connectTimeoutSeconds(),
        ];
    }

    public function all(): array
    {
        return [
            'ai_enabled' => $this->enabled(),
            'ai_provider' => $this->provider(),
            'ai_model' => $this->model(),
            'ai_api_key_masked' => $this->maskedApiKey(),
            'ai_has_api_key' => $this->hasApiKey(),
            'ai_base_url' => $this->baseUrl(),
            'ai_temperature' => $this->temperature(),
            'ai_max_tokens' => $this->maxTokens(),
            'ai_timeout_seconds' => $this->savedTimeoutSeconds(),
            'ai_connect_timeout_seconds' => $this->savedConnectTimeoutSeconds(),
            'ai_effective_timeout_seconds' => $this->timeoutSeconds(),
            'ai_effective_connect_timeout_seconds' => $this->connectTimeoutSeconds(),
            'ai_stream_enabled' => $this->streamEnabled(),
            'ai_cache_enabled' => $this->cacheEnabled(),
            'ai_cache_ttl' => $this->cacheTtl(),
            'ai_context_max_rows' => $this->contextMaxRows(),
            'ai_context_max_chars' => $this->contextMaxChars(),
            'ai_fast_mode' => $this->fastMode(),
            'ai_copilot_enabled' => $this->copilotEnabled(),
            'ai_copilot_v2_enabled' => $this->copilotV2Enabled(),
            'ai_copilot_engine' => $this->copilotEngine(),
            'ai_copilot_read_only' => $this->copilotReadOnly(),
            'ai_rag_enabled' => $this->ragEnabled(),
            'ai_financial_tools_enabled' => $this->financialToolsEnabled(),
            'ai_document_scanning_enabled' => $this->documentScanningEnabled(),
            'ai_document_provider' => $this->documentProvider(),
            'ai_document_model' => $this->documentModel(),
            'ai_write_actions_enabled' => $this->writeActionsEnabled(),
            'ai_action_execution_enabled' => $this->actionExecutionEnabled(),
            'ai_embedding_provider' => $this->embeddingProvider(),
            'ai_embedding_model' => $this->embeddingModel(),
            'ai_embedding_dimensions' => $this->embeddingDimensions(),
            'ai_rag_top_k' => $this->ragTopK(),
            'ai_rag_candidate_pool' => $this->ragCandidatePool(),
            'ai_rag_max_candidate_pool' => $this->ragMaxCandidatePool(),
            'ai_rag_min_vector_score' => $this->ragMinimumVectorScore(),
            'ai_rag_context_max_chars' => $this->ragContextMaxChars(),
        ];
    }

    /** Providers available through the configured embedding adapter. */
    /**
     * Delegated to the capability registry so this cannot drift from what
     * readiness and the settings screen report for the same provider.
     */
    public function supportsEmbeddings(): bool
    {
        return app(AiProviderCapabilityRegistry::class)
            ->providerSupportsEmbeddings($this->embeddingProvider());
    }

    /**
     * Whether the embedding provider accepts many inputs in one request.
     *
     * Indexing a knowledge base one HTTP round trip per chunk is the difference
     * between an index that rebuilds in under a minute and one that takes an
     * hour and times out on shared hosting. Every provider KiteLedger supports
     * for embeddings does accept an array, but the capability is stated
     * explicitly rather than assumed, so adding a provider that does not cannot
     * silently break indexing.
     */
    public function supportsBatchEmbeddings(): bool
    {
        return app(AiProviderCapabilityRegistry::class)
            ->providerSupportsBatchEmbeddings($this->embeddingProvider());
    }

    /**
     * Inputs per batched embedding request.
     *
     * Kept modest: a very large batch is one request that can fail wholesale,
     * and providers cap the total tokens per call regardless of the item count.
     */
    public function embeddingBatchSize(): int
    {
        return max(1, min(96, (int) config('ai.embedding.batch_size', 32)));
    }

    public function embeddingModel(): string
    {
        $m = (string) $this->value('ai_embedding_model', '');
        if ($m) {
            return $m;
        }

        $configured = (string) config('ai.embedding.model', '');

        return $configured ?: $this->defaultEmbeddingModelFor($this->embeddingProvider());
    }

    private function defaultEmbeddingModelFor(string $provider): string
    {
        return match ($provider) {
            'gemini' => 'gemini-embedding-001',
            'ollama' => 'nomic-embed-text',
            'openrouter' => 'openai/text-embedding-3-small',
            default => 'text-embedding-3-small', // openai
        };
    }

    private function defaultModelFor(string $provider): string
    {
        return match ($provider) {
            'groq' => 'llama-3.1-8b-instant',
            'gemini' => 'gemini-2.5-flash',
            'ollama' => 'llama3.1:8b',
            'openrouter' => 'google/gemini-2.0-flash-001',
            default => 'gpt-4o-mini',
        };
    }

    private function defaultBaseUrlFor(string $provider): string
    {
        return match ($provider) {
            'groq' => 'https://api.groq.com/openai/v1',
            'ollama' => 'http://localhost:11434',
            'gemini' => 'https://generativelanguage.googleapis.com/v1beta/models',
            'openrouter' => 'https://openrouter.ai/api/v1',
            default => 'https://api.openai.com/v1',
        };
    }

    private function minimumRuntimeTimeoutForProvider(string $provider): int
    {
        return match ($provider) {
            'ollama' => 180,
            'gemini' => 180,
            'openrouter' => 120,
            default => 120,
        };
    }
}
