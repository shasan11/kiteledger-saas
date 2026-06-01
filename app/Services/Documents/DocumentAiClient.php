<?php

namespace App\Services\Documents;

use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Dedicated client for document scanning with vision-capable providers.
 * Separate from AiProviderManager so document scanning can evolve independently.
 *
 * Supports Gemini (vision) and OpenAI-compatible (image_url content). Falls back
 * with a clear error if the provider does not support vision.
 */
class DocumentAiClient
{
    public function __construct(protected AiSettingsService $settings) {}

    public function provider(): string
    {
        return (string) (config('documents.ai_provider') ?: $this->settings->provider());
    }

    public function model(): string
    {
        return (string) (config('documents.ai_model') ?: $this->settings->model());
    }

    public function supportsVision(): bool
    {
        $provider = $this->provider();
        if ($provider === 'gemini') return true;
        if (in_array($provider, ['openai', 'groq'], true)) {
            // Most modern OpenAI vision models accept image_url. We allow the call;
            // if the model is not vision-capable the API will return an error.
            return true;
        }
        return false;
    }

    public function timeoutSeconds(): int
    {
        $cfg = (int) config('documents.scan_timeout_seconds', 120);
        return max($cfg, $this->settings->timeoutSeconds());
    }

    /**
     * Run a vision extraction call with the document bytes.
     *
     * @param string $base64 base64-encoded file contents
     * @param string $mime mime type (image/png, image/jpeg, application/pdf, ...)
     * @param string $systemPrompt
     * @param string $userPrompt
     * @return array{ok:bool,text:string,provider:string,model:string,usage:array}
     */
    public function extract(string $base64, string $mime, string $systemPrompt, string $userPrompt): array
    {
        if (!$this->settings->enabled()) {
            $this->fail('AI_DISABLED', 'AI Assistant is disabled in settings.');
        }
        if (!$this->supportsVision()) {
            $this->fail('AI_VISION_UNSUPPORTED', 'Current AI provider does not support document scanning. Please use Gemini Vision or OpenAI Vision-compatible provider.');
        }
        if ($this->provider() !== 'ollama' && !$this->settings->hasApiKey()) {
            $this->fail('AI_API_KEY_MISSING', 'AI API key is missing. Please configure it in AI Settings.');
        }

        $timeout = $this->timeoutSeconds();
        if (function_exists('set_time_limit')) {
            @set_time_limit($timeout + 30);
        }

        try {
            return match ($this->provider()) {
                'gemini' => $this->callGemini($base64, $mime, $systemPrompt, $userPrompt, $timeout),
                'openai', 'groq' => $this->callOpenAi($base64, $mime, $systemPrompt, $userPrompt, $timeout),
                default => $this->fail('AI_VISION_UNSUPPORTED', 'Provider ' . $this->provider() . ' is not supported for document scanning.'),
            };
        } catch (AiProviderException $e) {
            throw $e;
        } catch (ConnectionException $e) {
            $this->fail('AI_TIMEOUT', "Document scan timed out after {$timeout}s. Try a smaller document or increase the scan timeout in AI Settings.");
        } catch (RequestException $e) {
            $status = $e->response?->status();
            $body   = (string) ($e->response?->body() ?? '');
            Log::warning('Document AI provider error', ['provider' => $this->provider(), 'status' => $status, 'body' => mb_substr($body, 0, 500)]);

            if ($status === 401 || $status === 403) {
                $this->fail('AI_PROVIDER_AUTH_FAILED', 'AI provider authentication failed. Please verify your API key in AI Settings.');
            }
            // Gemini returns 400 for invalid API keys
            if ($status === 400 && $this->provider() === 'gemini') {
                $lower = strtolower($body);
                if (str_contains($lower, 'api key') || str_contains($lower, 'api_key') || str_contains($lower, 'invalid argument')) {
                    $this->fail('AI_PROVIDER_AUTH_FAILED', 'Gemini API key is invalid or expired. Please update it in AI Settings.');
                }
            }
            if ($status === 404) {
                $this->fail('AI_MODEL_INVALID', 'AI model not found. Please check your model name in AI Settings.');
            }
            if ($status === 429) {
                $this->fail('AI_RATE_LIMIT', 'AI provider rate limit reached. Please try again shortly.');
            }
            $this->fail('AI_PROVIDER_ERROR', "Document scan failed (HTTP {$status}). Please check your AI Settings.");
        } catch (Throwable $e) {
            Log::error('Document AI exception', ['provider' => $this->provider(), 'msg' => $e->getMessage()]);
            $this->fail('AI_PROVIDER_ERROR', 'Document scan failed unexpectedly. Please check your AI Settings and try again.');
        }
    }

    private function callGemini(string $base64, string $mime, string $systemPrompt, string $userPrompt, int $timeout): array
    {
        $model = $this->model();
        $url = rtrim($this->settings->baseUrl(), '/') . "/models/{$model}:generateContent?key=" . urlencode($this->settings->apiKey() ?? '');

        $body = [
            'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
            'contents' => [[
                'role' => 'user',
                'parts' => [
                    ['text' => $userPrompt],
                    ['inlineData' => ['mimeType' => $mime, 'data' => $base64]],
                ],
            ]],
            'generationConfig' => [
                'temperature' => 0.1,
                'maxOutputTokens' => 4096,
                'responseMimeType' => 'application/json',
            ],
        ];

        $response = Http::timeout($timeout)
            ->connectTimeout($this->settings->connectTimeoutSeconds())
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

    private function callOpenAi(string $base64, string $mime, string $systemPrompt, string $userPrompt, int $timeout): array
    {
        $model = $this->model();
        $url = rtrim($this->settings->baseUrl(), '/') . '/chat/completions';

        if ($mime === 'application/pdf') {
            $this->fail('AI_VISION_UNSUPPORTED', 'OpenAI chat endpoint does not accept PDF directly. Convert to images or use Gemini.');
        }

        $dataUrl = "data:{$mime};base64,{$base64}";

        $payload = [
            'model' => $model,
            'temperature' => 0.1,
            'max_tokens' => 4096,
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => [
                    ['type' => 'text', 'text' => $userPrompt],
                    ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]],
                ]],
            ],
        ];

        $response = Http::timeout($timeout)
            ->connectTimeout($this->settings->connectTimeoutSeconds())
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->settings->apiKey(),
                'Content-Type' => 'application/json',
            ])
            ->post($url, $payload)
            ->throw();

        $data = $response->json();
        $text = $data['choices'][0]['message']['content'] ?? '';

        return [
            'ok' => true,
            'provider' => $this->provider(),
            'model' => $model,
            'text' => trim((string) $text),
            'usage' => [
                'prompt' => $data['usage']['prompt_tokens'] ?? null,
                'completion' => $data['usage']['completion_tokens'] ?? null,
                'total' => $data['usage']['total_tokens'] ?? null,
            ],
        ];
    }

    private function fail(string $code, string $message): never
    {
        throw new AiProviderException($message, $code);
    }
}
