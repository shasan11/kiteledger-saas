<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Exceptions\PrismException;
use Prism\Prism\Facades\Prism;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;
use Throwable;

class AiProviderManager
{
    public function __construct(protected AiSettingsService $settings) {}

    /**
     * Call configured provider through Prism. Returns:
     *   ['ok' => bool, 'text' => string, 'provider' => ..., 'model' => ..., 'usage' => [...]]
     * Or throws AiProviderException with code.
     */
    public function chat(array $messages, array $opts = []): array
    {
        $this->ensureUsable();

        $provider = strtolower((string) $this->settings->provider());
        $model = (string) ($opts['model'] ?? $this->settings->model());
        $temperature = (float) ($opts['temperature'] ?? $this->settings->temperature());
        $maxTokens = (int) ($opts['max_tokens'] ?? $this->settings->maxTokens());
        $timeout = (int) ($opts['timeout'] ?? $this->settings->timeoutSeconds());
        $connectTimeout = (int) $this->settings->connectTimeoutSeconds();

        if (function_exists('set_time_limit')) {
            @set_time_limit($timeout + 20);
        }

        $startedAt = microtime(true);

        try {
            $response = $this->buildPrismRequest($provider, $model, $messages, $temperature, $maxTokens, $timeout, $connectTimeout)
                ->asText();

            $duration = (int) round((microtime(true) - $startedAt) * 1000);

            Log::info('AI provider call', [
                'provider' => $provider,
                'model' => $model,
                'timeout' => $timeout,
                'duration_ms' => $duration,
                'status' => 'ok',
                'usage' => [
                    'prompt' => $response->usage->promptTokens ?? null,
                    'completion' => $response->usage->completionTokens ?? null,
                ],
            ]);

            return [
                'ok' => true,
                'provider' => $provider,
                'model' => $model,
                'text' => trim((string) ($response->text ?? '')) ?: '(no response)',
                'usage' => [
                    'prompt' => $response->usage->promptTokens ?? null,
                    'completion' => $response->usage->completionTokens ?? null,
                    'total' => (($response->usage->promptTokens ?? 0) + ($response->usage->completionTokens ?? 0)) ?: null,
                ],
                'finish_reason' => $response->finishReason->name ?? null,
            ];
        } catch (PrismException $e) {
            Log::warning('Prism provider error', [
                'provider' => $provider,
                'model' => $model,
                'message' => $e->getMessage(),
            ]);
            $this->throwMappedError($provider, $model, $e);
        } catch (Throwable $e) {
            Log::error('AI provider exception', [
                'provider' => $provider,
                'model' => $model,
                'message' => $e->getMessage(),
            ]);
            $this->throwMappedError($provider, $model, $e);
        }
    }

    public function testConnection(): array
    {
        $timeout = $this->settings->provider() === 'ollama'
            ? max(60, $this->settings->timeoutSeconds())
            : min(30, max(20, $this->settings->timeoutSeconds()));

        try {
            $res = $this->chat([
                ['role' => 'system', 'content' => 'Reply with exactly: OK'],
                ['role' => 'user', 'content' => 'Reply with OK'],
            ], ['max_tokens' => 16, 'timeout' => $timeout]);

            return [
                'success' => true,
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'response' => $res['text'] ?? '',
            ];
        } catch (AiProviderException $e) {
            return [
                'success' => false,
                'code' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'code' => 'AI_PROVIDER_ERROR',
                'message' => $e->getMessage(),
            ];
        }
    }

    private function buildPrismRequest(string $provider, string $model, array $messages, float $temperature, int $maxTokens, int $timeout, int $connectTimeout)
    {
        $prepared = $this->prepareMessages($messages);
        $request = Prism::text()
            ->using($this->providerEnum($provider), $model)
            ->usingProviderConfig($this->providerConfig($provider))
            ->withClientOptions($this->clientOptions($timeout, $connectTimeout))
            ->withMaxTokens($maxTokens)
            ->usingTemperature($temperature);

        if ($prepared['system'] !== '') {
            $request = $request->withSystemPrompt($prepared['system']);
        }

        if ($prepared['messages']) {
            return $request->withMessages($prepared['messages']);
        }

        return $request->withPrompt('Reply with OK.');
    }

    private function clientOptions(int $timeout, int $connectTimeout): array
    {
        $options = [
            'timeout' => $timeout,
            'connect_timeout' => $connectTimeout,
            'force_ip_resolve' => 'v4',
        ];

        $caBundle = trim((string) env('AI_CA_BUNDLE', ''));
        if ($caBundle !== '') {
            $options['verify'] = $caBundle;
        }

        if (filter_var(env('AI_SSL_VERIFY', true), FILTER_VALIDATE_BOOLEAN) === false) {
            $options['verify'] = false;
        }

        return $options;
    }

    private function prepareMessages(array $messages): array
    {
        $systemParts = [];
        $chatMessages = [];

        foreach ($messages as $message) {
            $role = strtolower((string) ($message['role'] ?? 'user'));
            $content = trim((string) ($message['content'] ?? ''));

            if ($content === '') {
                continue;
            }

            if ($role === 'system') {
                $systemParts[] = $content;
                continue;
            }

            if ($role === 'assistant') {
                $chatMessages[] = new AssistantMessage($content);
                continue;
            }

            $chatMessages[] = new UserMessage($content);
        }

        return [
            'system' => trim(implode("\n\n", $systemParts)),
            'messages' => $chatMessages,
        ];
    }

    private function providerEnum(string $provider): Provider
    {
        return match ($provider) {
            'openai' => Provider::OpenAI,
            'groq' => Provider::Groq,
            'gemini' => Provider::Gemini,
            'ollama' => Provider::Ollama,
            'openrouter' => Provider::OpenRouter,
            default => $this->throwError('AI_PROVIDER_UNSUPPORTED', "Unsupported AI provider: {$provider}"),
        };
    }

    private function providerConfig(string $provider): array
    {
        $url = $this->normalizedBaseUrl($provider);
        $apiKey = $this->settings->apiKey() ?? '';

        return match ($provider) {
            'openai' => [
                'url' => $url,
                'api_key' => $apiKey,
                'organization' => config('prism.providers.openai.organization'),
                'project' => config('prism.providers.openai.project'),
            ],
            'groq' => [
                'url' => $url,
                'api_key' => $apiKey,
            ],
            'gemini' => [
                'url' => $url,
                'api_key' => $apiKey,
            ],
            'openrouter' => [
                'url' => $url,
                'api_key' => $apiKey,
                'site' => [
                    'http_referer' => config('prism.providers.openrouter.site.http_referer'),
                    'x_title' => config('prism.providers.openrouter.site.x_title') ?: config('app.name'),
                ],
            ],
            'ollama' => [
                'url' => $url,
            ],
            default => [],
        };
    }

    private function normalizedBaseUrl(string $provider): string
    {
        $url = rtrim($this->settings->baseUrl(), '/');

        if ($provider === 'gemini' && !str_ends_with($url, '/models')) {
            return $url . '/models';
        }

        return $url;
    }

    private function ensureUsable(): void
    {
        $provider = strtolower((string) $this->settings->provider());

        if (!$this->settings->enabled()) {
            $this->throwError('AI_DISABLED', 'AI Assistant is disabled in settings.');
        }

        if (!in_array($provider, ['openai', 'groq', 'gemini', 'ollama', 'openrouter'], true)) {
            $this->throwError('AI_PROVIDER_UNSUPPORTED', "Unsupported AI provider: {$provider}");
        }

        if (!$this->settings->model()) {
            $this->throwError('AI_MODEL_MISSING', 'AI model is missing. Please configure it in AI Settings.');
        }

        if ($provider !== 'ollama' && !$this->settings->hasApiKey()) {
            $this->throwError('AI_API_KEY_MISSING', 'AI provider key is missing. Please configure it in AI Settings.');
        }
    }

    private function throwMappedError(string $provider, string $model, Throwable $e): never
    {
        $message = $e->getMessage();
        $lower = strtolower($message);

        if (str_contains($lower, 'curl error 60') || str_contains($lower, 'unable to get local issuer certificate')) {
            $this->throwError('AI_SSL_CERTIFICATE_ERROR', 'PHP cannot verify the provider SSL certificate. Set AI_CA_BUNDLE to a valid cacert.pem path, or configure curl.cainfo and openssl.cafile in php.ini.');
        }

        if (str_contains($lower, 'overloaded') || str_contains($lower, 'service unavailable') || str_contains($lower, '503') || str_contains($lower, 'temporarily unavailable') || str_contains($lower, 'unavailable')) {
            $this->throwError('AI_PROVIDER_OVERLOADED', "{$provider} is overloaded right now. Switch to OpenRouter or Groq, or try again later.");
        }

        if (str_contains($lower, 'timed out') || str_contains($lower, 'timeout')) {
            $this->throwError('AI_TIMEOUT', "AI request timed out. Check internet/DNS/firewall/proxy or use a faster model for {$provider}.");
        }

        if (str_contains($lower, 'api key') || str_contains($lower, 'unauthorized') || str_contains($lower, 'authentication') || str_contains($lower, '401') || str_contains($lower, '403')) {
            $this->throwError('AI_PROVIDER_AUTH_FAILED', "{$provider} authentication failed. Check the provider key in AI Settings.");
        }

        if (str_contains($lower, 'model') && (str_contains($lower, 'not found') || str_contains($lower, 'does not exist') || str_contains($lower, 'unsupported'))) {
            $this->throwError('AI_MODEL_INVALID', "Model '{$model}' was rejected by {$provider}. Choose a valid model in AI Settings.");
        }

        if (str_contains($lower, 'rate limit') || str_contains($lower, 'quota') || str_contains($lower, '429')) {
            $this->throwError('AI_RATE_LIMIT', "{$provider} rate limit or quota was reached.");
        }

        $this->throwError('AI_PROVIDER_ERROR', $message ?: 'AI request failed unexpectedly. Please check AI Settings.');
    }

    private function throwError(string $code, string $message): never
    {
        throw new AiProviderException($message, $code);
    }
}
