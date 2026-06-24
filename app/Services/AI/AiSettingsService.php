<?php

namespace App\Services\AI;

use App\Services\Settings\DatabaseSettingService;
use Illuminate\Support\Facades\Crypt;
use Throwable;

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
        'ai_default_financial_date_scope' => 'current_fiscal_year',
        'ai_allow_developer_details' => false,
        'ai_financial_assistant_enabled' => true,
        'ai_document_assistant_enabled' => true,
        'ai_write_actions_enabled' => true,
        'ai_fallback_provider' => '',
        // 'full' = complete ERP agent (RAG, deterministic tools, action proposals);
        // 'reports_only' = restrict chat to report questions (legacy conservative mode).
        'ai_assistant_mode' => 'full',
    ];

    public function __construct(protected DatabaseSettingService $db) {}

    public function enabled(): bool
    {
        return $this->db->bool('ai_enabled', (bool) self::DEFAULTS['ai_enabled'], self::GROUP);
    }

    public function provider(): string
    {
        $p = strtolower($this->db->string('ai_provider', self::DEFAULTS['ai_provider'], self::GROUP));
        return $p ?: self::DEFAULTS['ai_provider'];
    }

    public function model(): string
    {
        $m = $this->db->string('ai_model', '', self::GROUP);
        if ($m) return $m;
        return $this->defaultModelFor($this->provider());
    }

    public function apiKey(): ?string
    {
        $raw = $this->db->string('ai_api_key', '', self::GROUP);
        if (!$raw) {
            $provider = $this->provider();
            $cfg = config("ai.providers.{$provider}.api_key") ?: config("prism.providers.{$provider}.api_key");
            return $cfg ?: null;
        }

        try {
            return Crypt::decryptString($raw);
        } catch (Throwable) {
            return $raw;
        }
    }

    public function hasApiKey(): bool
    {
        $key = $this->apiKey();
        return is_string($key) && trim($key) !== '';
    }

    public function maskedApiKey(): ?string
    {
        $key = $this->apiKey();
        if (!$key) return null;
        $len = mb_strlen($key);
        if ($len <= 8) return str_repeat('*', $len);
        return mb_substr($key, 0, 4) . '...' . mb_substr($key, -4);
    }

    public function baseUrl(): string
    {
        $url = $this->db->string('ai_base_url', '', self::GROUP);
        if ($url) return rtrim($url, '/');
        return $this->defaultBaseUrlFor($this->provider());
    }

    public function temperature(): float
    {
        return $this->db->float('ai_temperature', (float) self::DEFAULTS['ai_temperature'], self::GROUP);
    }

    public function maxTokens(): int
    {
        return max(50, min(32000, $this->db->int('ai_max_tokens', (int) self::DEFAULTS['ai_max_tokens'], self::GROUP)));
    }

    public function savedTimeoutSeconds(): int
    {
        return max(5, min(600, $this->db->int('ai_timeout_seconds', (int) self::DEFAULTS['ai_timeout_seconds'], self::GROUP)));
    }

    public function timeoutSeconds(): int
    {
        $saved = $this->savedTimeoutSeconds();
        return max($this->minimumRuntimeTimeoutForProvider($this->provider()), $saved);
    }

    public function savedConnectTimeoutSeconds(): int
    {
        return max(2, min(60, $this->db->int('ai_connect_timeout_seconds', (int) self::DEFAULTS['ai_connect_timeout_seconds'], self::GROUP)));
    }

    public function connectTimeoutSeconds(): int
    {
        return max(10, $this->savedConnectTimeoutSeconds());
    }

    public function streamEnabled(): bool
    {
        return $this->db->bool('ai_stream_enabled', (bool) self::DEFAULTS['ai_stream_enabled'], self::GROUP);
    }

    public function cacheEnabled(): bool
    {
        return $this->db->bool('ai_cache_enabled', (bool) self::DEFAULTS['ai_cache_enabled'], self::GROUP);
    }

    public function cacheTtl(): int
    {
        return max(30, $this->db->int('ai_cache_ttl', (int) self::DEFAULTS['ai_cache_ttl'], self::GROUP));
    }

    public function contextMaxRows(): int
    {
        return max(1, min(500, $this->db->int('ai_context_max_rows', (int) self::DEFAULTS['ai_context_max_rows'], self::GROUP)));
    }

    public function reportSummaryMaxRows(): int
    {
        return max(1, min(50, $this->db->int('ai_context_max_rows', (int) self::DEFAULTS['ai_context_max_rows'], self::GROUP)));
    }

    public function contextMaxChars(): int
    {
        return max(500, min(200000, $this->db->int('ai_context_max_chars', (int) self::DEFAULTS['ai_context_max_chars'], self::GROUP)));
    }

    public function fastMode(): bool
    {
        return $this->db->bool('ai_fast_mode', (bool) self::DEFAULTS['ai_fast_mode'], self::GROUP);
    }

    public function financialAssistantEnabled(): bool
    {
        return $this->db->bool('ai_financial_assistant_enabled', (bool) self::DEFAULTS['ai_financial_assistant_enabled'], self::GROUP);
    }

    public function writeActionsEnabled(): bool
    {
        return $this->db->bool('ai_write_actions_enabled', (bool) self::DEFAULTS['ai_write_actions_enabled'], self::GROUP);
    }

    public function assistantMode(): string
    {
        $mode = strtolower(trim($this->db->string('ai_assistant_mode', self::DEFAULTS['ai_assistant_mode'], self::GROUP)));

        return in_array($mode, ['full', 'reports_only'], true) ? $mode : 'full';
    }

    public function reportsOnly(): bool
    {
        return $this->assistantMode() === 'reports_only';
    }

    public function setApiKey(string $key): void
    {
        $encrypted = Crypt::encryptString($key);
        $this->db->set('ai_api_key', $encrypted, self::GROUP);
    }

    public function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            if ($value === null) continue;
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            $this->db->set($key, $value, self::GROUP);
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
            'ai_default_financial_date_scope' => $this->db->string('ai_default_financial_date_scope', self::DEFAULTS['ai_default_financial_date_scope'], self::GROUP),
            'ai_allow_developer_details' => $this->db->bool('ai_allow_developer_details', (bool) self::DEFAULTS['ai_allow_developer_details'], self::GROUP),
            'ai_financial_assistant_enabled' => $this->financialAssistantEnabled(),
            'ai_document_assistant_enabled' => $this->db->bool('ai_document_assistant_enabled', (bool) self::DEFAULTS['ai_document_assistant_enabled'], self::GROUP),
            'ai_write_actions_enabled' => $this->db->bool('ai_write_actions_enabled', (bool) self::DEFAULTS['ai_write_actions_enabled'], self::GROUP),
            'ai_fallback_provider' => $this->db->string('ai_fallback_provider', self::DEFAULTS['ai_fallback_provider'], self::GROUP),
            'ai_assistant_mode' => $this->assistantMode(),
        ];
    }

    /** Providers Prism can generate embeddings with (RAG). Groq has none. */
    public function supportsEmbeddings(): bool
    {
        return in_array($this->provider(), ['openai', 'gemini', 'ollama', 'openrouter'], true);
    }

    public function embeddingModel(): string
    {
        $m = $this->db->string('ai_embedding_model', '', self::GROUP);
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
