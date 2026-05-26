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
        'ai_max_tokens' => 900,
        'ai_timeout_seconds' => 25,
        'ai_connect_timeout_seconds' => 5,
        'ai_stream_enabled' => true,
        'ai_cache_enabled' => true,
        'ai_cache_ttl' => 600,
        'ai_context_max_rows' => 30,
        'ai_context_max_chars' => 12000,
        'ai_fast_mode' => true,
    ];

    public function __construct(protected DatabaseSettingService $db) {}

    public function enabled(): bool
    {
        return $this->db->bool('ai_enabled', (bool) self::DEFAULTS['ai_enabled'], self::GROUP);
    }

    public function provider(): string
    {
        $p = $this->db->string('ai_provider', self::DEFAULTS['ai_provider'], self::GROUP);
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
            // env fallback only
            $provider = $this->provider();
            $cfg = config("ai.providers.{$provider}.api_key");
            return $cfg ?: null;
        }
        // Try decrypt; if it fails treat as plain (legacy).
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
        return $this->db->int('ai_max_tokens', (int) self::DEFAULTS['ai_max_tokens'], self::GROUP);
    }

    public function timeoutSeconds(): int
    {
        return max(5, $this->db->int('ai_timeout_seconds', (int) self::DEFAULTS['ai_timeout_seconds'], self::GROUP));
    }

    public function connectTimeoutSeconds(): int
    {
        return max(2, $this->db->int('ai_connect_timeout_seconds', (int) self::DEFAULTS['ai_connect_timeout_seconds'], self::GROUP));
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
        return $this->db->int('ai_context_max_rows', (int) self::DEFAULTS['ai_context_max_rows'], self::GROUP);
    }

    public function contextMaxChars(): int
    {
        return $this->db->int('ai_context_max_chars', (int) self::DEFAULTS['ai_context_max_chars'], self::GROUP);
    }

    public function fastMode(): bool
    {
        return $this->db->bool('ai_fast_mode', (bool) self::DEFAULTS['ai_fast_mode'], self::GROUP);
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
            'ai_timeout_seconds' => $this->timeoutSeconds(),
            'ai_connect_timeout_seconds' => $this->connectTimeoutSeconds(),
            'ai_stream_enabled' => $this->streamEnabled(),
            'ai_cache_enabled' => $this->cacheEnabled(),
            'ai_cache_ttl' => $this->cacheTtl(),
            'ai_context_max_rows' => $this->contextMaxRows(),
            'ai_context_max_chars' => $this->contextMaxChars(),
            'ai_fast_mode' => $this->fastMode(),
        ];
    }

    private function defaultModelFor(string $provider): string
    {
        return match ($provider) {
            'groq' => 'llama-3.1-8b-instant',
            'gemini' => 'gemini-1.5-flash',
            'ollama' => 'llama3.1:8b',
            default => 'gpt-4o-mini',
        };
    }

    private function defaultBaseUrlFor(string $provider): string
    {
        return match ($provider) {
            'groq' => 'https://api.groq.com/openai/v1',
            'ollama' => 'http://localhost:11434',
            'gemini' => 'https://generativelanguage.googleapis.com/v1beta',
            default => 'https://api.openai.com/v1',
        };
    }
}
