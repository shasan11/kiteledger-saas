<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class AiProviderManager
{
    public function __construct(protected AiSettingsService $settings) {}

    /**
     * Call configured provider. Returns:
     *   ['ok' => bool, 'text' => string, 'provider' => ..., 'model' => ..., 'usage' => [...]]
     * Or throws AiProviderException with code.
     */
    public function chat(array $messages, array $opts = []): array
    {
        $this->ensureUsable();

        $provider = $this->settings->provider();
        $model = $opts['model'] ?? $this->settings->model();
        $temperature = $opts['temperature'] ?? $this->settings->temperature();
        $maxTokens = $opts['max_tokens'] ?? $this->settings->maxTokens();
        $timeout = $opts['timeout'] ?? $this->settings->timeoutSeconds();
        $connectTimeout = $this->settings->connectTimeoutSeconds();

        // Give PHP some headroom over the HTTP timeout so we surface a clean
        // AI_TIMEOUT rather than a fatal max_execution_time error.
        if (function_exists('set_time_limit')) {
            @set_time_limit($timeout + 20);
        }

        $startedAt = microtime(true);

        try {
            $result = match ($provider) {
                'openai', 'groq' => $this->callOpenAiCompatible($model, $messages, $temperature, $maxTokens, $timeout, $connectTimeout),
                'ollama' => $this->callOllama($model, $messages, $temperature, $maxTokens, $timeout, $connectTimeout),
                'gemini' => $this->callGemini($model, $messages, $temperature, $maxTokens, $timeout, $connectTimeout),
                default => $this->throwError('AI_PROVIDER_UNSUPPORTED', "Unsupported AI provider: {$provider}"),
            };

            $duration = (int) round((microtime(true) - $startedAt) * 1000);
            Log::info('AI provider call', [
                'provider' => $provider,
                'model' => $model,
                'timeout' => $timeout,
                'duration_ms' => $duration,
                'status' => 'ok',
                'usage' => $result['usage'] ?? null,
            ]);
            if (($result['text'] ?? '') === '') {
                $result['text'] = '(no response)';
            }
            return $result;
        } catch (ConnectionException $e) {
            Log::warning('AI provider timeout', ['provider' => $provider, 'model' => $model, 'timeout' => $timeout]);
            $this->throwError('AI_TIMEOUT', "AI request timed out after {$timeout}s. Reduce context size, reduce max tokens, or use a faster model.");
        } catch (RequestException $e) {
            $status = $e->response?->status();
            if ($status === 401 || $status === 403) {
                $this->throwError('AI_PROVIDER_AUTH_FAILED', 'AI provider authentication failed. Check the API key in AI Settings.');
            }
            if ($status === 429) {
                $this->throwError('AI_RATE_LIMIT', 'AI provider rate limit reached. Please try again shortly.');
            }
            Log::warning('AI provider error', [
                'provider' => $provider,
                'model' => $model,
                'status' => $status,
                'body' => $this->truncateBody($e->response?->body()),
            ]);
            $this->throwError('AI_PROVIDER_ERROR', "AI request failed (HTTP {$status}). Please check AI Settings.");
        } catch (AiProviderException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('AI provider exception', [
                'provider' => $provider,
                'model' => $model,
                'message' => $e->getMessage(),
            ]);
            $this->throwError('AI_PROVIDER_ERROR', 'AI request failed: ' . $e->getMessage());
        }
    }

    private function truncateBody(?string $body, int $max = 500): ?string
    {
        if (!$body) return null;
        return mb_strlen($body) > $max ? mb_substr($body, 0, $max) . '…' : $body;
    }

    public function testConnection(): array
    {
        // Local providers (ollama) often need 30-90s on first request because
        // the model has to load into VRAM. Use the configured timeout — not a
        // tight hardcoded 10s — so Test Connection matches real usage.
        $timeout = $this->settings->provider() === 'ollama'
            ? max(60, $this->settings->timeoutSeconds())
            : $this->settings->timeoutSeconds();

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

    private function ensureUsable(): void
    {
        if (!$this->settings->enabled()) {
            $this->throwError('AI_DISABLED', 'AI Assistant is disabled in settings.');
        }
        if (!$this->settings->provider()) {
            $this->throwError('AI_PROVIDER_MISSING', 'AI provider is missing. Please configure it in AI Settings.');
        }
        if (!$this->settings->model()) {
            $this->throwError('AI_MODEL_MISSING', 'AI model is missing. Please configure it in AI Settings.');
        }
        if ($this->settings->provider() !== 'ollama' && !$this->settings->hasApiKey()) {
            $this->throwError('AI_API_KEY_MISSING', 'AI API key is missing. Please configure it in AI Settings.');
        }
    }

    private function callOpenAiCompatible(string $model, array $messages, float $temperature, int $maxTokens, int $timeout, int $connectTimeout): array
    {
        $url = rtrim($this->settings->baseUrl(), '/') . '/chat/completions';

        $response = Http::timeout($timeout)
            ->connectTimeout($connectTimeout)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->settings->apiKey(),
                'Content-Type' => 'application/json',
            ])
            ->post($url, [
                'model' => $model,
                'messages' => $messages,
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
                'stream' => false,
            ])
            ->throw();

        $data = $response->json();
        $text = $data['choices'][0]['message']['content'] ?? '';

        return [
            'ok' => true,
            'provider' => $this->settings->provider(),
            'model' => $model,
            'text' => trim((string) $text),
            'usage' => [
                'prompt' => $data['usage']['prompt_tokens'] ?? null,
                'completion' => $data['usage']['completion_tokens'] ?? null,
                'total' => $data['usage']['total_tokens'] ?? null,
            ],
        ];
    }

    private function callOllama(string $model, array $messages, float $temperature, int $maxTokens, int $timeout, int $connectTimeout): array
    {
        $url = rtrim($this->settings->baseUrl(), '/') . '/api/chat';

        $response = Http::timeout($timeout)
            ->connectTimeout($connectTimeout)
            ->post($url, [
                'model' => $model,
                'messages' => $messages,
                'stream' => false,
                'options' => [
                    'temperature' => $temperature,
                    'num_predict' => $maxTokens,
                ],
            ])
            ->throw();

        $data = $response->json();
        $text = $data['message']['content'] ?? '';

        return [
            'ok' => true,
            'provider' => 'ollama',
            'model' => $model,
            'text' => trim((string) $text),
            'usage' => [
                'prompt' => $data['prompt_eval_count'] ?? null,
                'completion' => $data['eval_count'] ?? null,
                'total' => ($data['prompt_eval_count'] ?? 0) + ($data['eval_count'] ?? 0),
            ],
        ];
    }

    private function callGemini(string $model, array $messages, float $temperature, int $maxTokens, int $timeout, int $connectTimeout): array
    {
        // Combine system + user messages into Gemini parts
        $systemText = '';
        $contents = [];
        foreach ($messages as $m) {
            if (($m['role'] ?? '') === 'system') {
                $systemText .= ($systemText ? "\n" : '') . $m['content'];
                continue;
            }
            $contents[] = [
                'role' => ($m['role'] ?? 'user') === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content'] ?? '']],
            ];
        }

        $url = rtrim($this->settings->baseUrl(), '/') . "/models/{$model}:generateContent?key=" . urlencode($this->settings->apiKey() ?? '');

        $body = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => $temperature,
                'maxOutputTokens' => $maxTokens,
            ],
        ];
        if ($systemText) {
            $body['systemInstruction'] = ['parts' => [['text' => $systemText]]];
        }

        $response = Http::timeout($timeout)
            ->connectTimeout($connectTimeout)
            ->post($url, $body)
            ->throw();

        $data = $response->json();
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        return [
            'ok' => true,
            'provider' => 'gemini',
            'model' => $model,
            'text' => trim((string) $text),
            'usage' => [
                'prompt' => $data['usageMetadata']['promptTokenCount'] ?? null,
                'completion' => $data['usageMetadata']['candidatesTokenCount'] ?? null,
                'total' => $data['usageMetadata']['totalTokenCount'] ?? null,
            ],
        ];
    }

    private function throwError(string $code, string $message): never
    {
        throw new AiProviderException($message, $code);
    }
}
