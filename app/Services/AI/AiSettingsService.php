<?php

namespace App\Services\AI;

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
        'ai_stream_enabled' => false,
        'ai_cache_enabled' => true,
        'ai_cache_ttl' => 600,
        'ai_context_max_rows' => 15,
        'ai_context_max_chars' => 5000,
        'ai_fast_mode' => true,
        // Compatibility defaults for the unregistered add-on candidate. These
        // are intentionally excluded from the core settings API and UI.
        'ai_default_financial_date_scope' => 'current_fiscal_year',
        'ai_allow_developer_details' => false,
        'ai_financial_assistant_enabled' => false,
        'ai_document_assistant_enabled' => false,
        'ai_write_actions_enabled' => false,
        'ai_fallback_provider' => '',
        'ai_assistant_mode' => 'reports_only',
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

    public function writeActionsEnabled(): bool
    {
        return filter_var($this->value('ai_write_actions_enabled', self::DEFAULTS['ai_write_actions_enabled']), FILTER_VALIDATE_BOOL);
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
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            $type = is_bool($value) ? 'boolean' : (is_int($value) ? 'integer' : (is_float($value) ? 'decimal' : 'string'));
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
        ];
    }

    /** Providers Prism can generate embeddings with (RAG). Groq has none. */
    public function supportsEmbeddings(): bool
    {
        return in_array($this->provider(), ['openai', 'gemini', 'ollama', 'openrouter'], true);
    }

    public function embeddingModel(): string
    {
        $m = (string) $this->value('ai_embedding_model', '');
        if ($m) {
            return $m;
        }

        return $this->defaultEmbeddingModelFor($this->provider());
    }

    private function defaultEmbeddingModelFor(string $provider): string
    {
        return match ($provider) {
            'gemini' => 'text-embedding-004',
            'ollama' => 'nomic-embed-text',
            'openrouter' => 'openai/text-embedding-3-small',
            default => 'text-embedding-3-small', // openai
        };
    }

    private function defaultModelFor(string $provider): string
    {
        return match ($provider) {
            'groq' => 'llama-3.1-8b-instant',
            'gemini' => 'gemini-2.0-flash',
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
