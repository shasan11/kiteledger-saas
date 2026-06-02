<?php

namespace App\Services\Documents;

use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Exceptions\PrismException;
use Prism\Prism\Facades\Prism;
use Prism\Prism\ValueObjects\Media\Document;
use Prism\Prism\ValueObjects\Media\Image;
use Throwable;

/**
 * Dedicated Prism-backed client for document scanning with multimodal providers.
 */
class DocumentAiClient
{
    public function __construct(protected AiSettingsService $settings) {}

    public function provider(): string
    {
        return strtolower((string) (config('documents.ai_provider') ?: $this->settings->provider()));
    }

    public function model(): string
    {
        return (string) (config('documents.ai_model') ?: $this->settings->model());
    }

    public function supportsVision(?string $mime = null): bool
    {
        $provider = $this->provider();

        if ($provider === 'gemini') {
            return true;
        }

        if (in_array($provider, ['openai', 'openrouter'], true)) {
            return true;
        }

        if ($provider === 'groq') {
            return $mime !== 'application/pdf';
        }

        return false;
    }

    public function timeoutSeconds(): int
    {
        $cfg = (int) config('documents.scan_timeout_seconds', 120);
        return max($cfg, $this->settings->timeoutSeconds());
    }

    /**
     * Run a Prism multimodal extraction call with the document bytes.
     *
     * @param string $base64 base64-encoded file contents
     * @param string $mime mime type (image/png, image/jpeg, application/pdf, ...)
     * @param string $systemPrompt
     * @param string $userPrompt
     * @return array{ok:bool,text:string,provider:string,model:string,usage:array}
     */
    public function extract(string $base64, string $mime, string $systemPrompt, string $userPrompt): array
    {
        $provider = $this->provider();
        $model = $this->model();

        if (!$this->settings->enabled()) {
            $this->fail('AI_DISABLED', 'AI Assistant is disabled in settings.');
        }

        if (!$this->supportsVision($mime)) {
            $this->fail('AI_VISION_UNSUPPORTED', "Provider {$provider} is not supported for this document type. Use Gemini for PDFs or OpenRouter/OpenAI for image documents.");
        }

        if ($provider !== 'ollama' && !$this->settings->hasApiKey()) {
            $this->fail('AI_API_KEY_MISSING', 'AI provider key is missing. Please configure it in AI Settings.');
        }

        $timeout = $this->timeoutSeconds();
        if (function_exists('set_time_limit')) {
            @set_time_limit($timeout + 30);
        }

        try {
            $media = $this->mediaFromBase64($base64, $mime);

            $response = Prism::text()
                ->using($this->providerEnum($provider), $model)
                ->usingProviderConfig($this->providerConfig($provider))
                ->withClientOptions($this->clientOptions($timeout))
                ->withSystemPrompt($systemPrompt)
                ->withMaxTokens(4096)
                ->usingTemperature(0.1)
                ->withPrompt($userPrompt, [$media])
                ->asText();

            return [
                'ok' => true,
                'provider' => $provider,
                'model' => $model,
                'text' => trim((string) ($response->text ?? '')),
                'usage' => [
                    'prompt' => $response->usage->promptTokens ?? null,
                    'completion' => $response->usage->completionTokens ?? null,
                    'total' => (($response->usage->promptTokens ?? 0) + ($response->usage->completionTokens ?? 0)) ?: null,
                ],
            ];
        } catch (PrismException $e) {
            Log::warning('Document Prism provider error', [
                'provider' => $provider,
                'model' => $model,
                'message' => $e->getMessage(),
            ]);
            $this->throwMappedError($provider, $model, $e);
        } catch (AiProviderException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('Document AI exception', [
                'provider' => $provider,
                'model' => $model,
                'msg' => $e->getMessage(),
            ]);
            $this->throwMappedError($provider, $model, $e);
        }
    }

    private function mediaFromBase64(string $base64, string $mime)
    {
        if ($mime === 'application/pdf' || str_contains($mime, 'pdf')) {
            return Document::fromBase64(
                base64: $base64,
                mimeType: $mime,
                title: 'uploaded-document.pdf',
            );
        }

        if (str_starts_with($mime, 'image/')) {
            return Image::fromBase64(base64: $base64)->as('uploaded-document.' . $this->extensionForMime($mime));
        }

        return Document::fromBase64(
            base64: $base64,
            mimeType: $mime ?: 'application/octet-stream',
            title: 'uploaded-document',
        );
    }

    private function providerEnum(string $provider): Provider
    {
        return match ($provider) {
            'openai' => Provider::OpenAI,
            'groq' => Provider::Groq,
            'gemini' => Provider::Gemini,
            'openrouter' => Provider::OpenRouter,
            default => $this->fail('AI_VISION_UNSUPPORTED', "Provider {$provider} is not supported for document scanning."),
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

    private function clientOptions(int $timeout): array
    {
        $options = [
            'timeout' => $timeout,
            'connect_timeout' => $this->settings->connectTimeoutSeconds(),
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

    private function extensionForMime(string $mime): string
    {
        return match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'img',
        };
    }

    private function throwMappedError(string $provider, string $model, Throwable $e): never
    {
        $message = $e->getMessage();
        $lower = strtolower($message);

        if (str_contains($lower, 'curl error 60') || str_contains($lower, 'unable to get local issuer certificate')) {
            $this->fail('AI_SSL_CERTIFICATE_ERROR', 'PHP cannot verify the provider SSL certificate. Set AI_CA_BUNDLE to a valid cacert.pem path, or configure curl.cainfo and openssl.cafile in php.ini.');
        }

        if (str_contains($lower, 'overloaded') || str_contains($lower, '503') || str_contains($lower, 'temporarily unavailable') || str_contains($lower, 'unavailable')) {
            $this->fail('AI_PROVIDER_OVERLOADED', "{$provider} is overloaded right now. Use OpenRouter/OpenAI for images, Gemini for PDFs, or try again later.");
        }

        if (str_contains($lower, 'timed out') || str_contains($lower, 'timeout')) {
            $this->fail('AI_TIMEOUT', "Document scan timed out. Reduce file size/pages or use a faster model for {$provider}.");
        }

        if (str_contains($lower, 'api key') || str_contains($lower, 'unauthorized') || str_contains($lower, 'authentication') || str_contains($lower, '401') || str_contains($lower, '403')) {
            $this->fail('AI_PROVIDER_AUTH_FAILED', "{$provider} authentication failed. Check the provider key in AI Settings.");
        }

        if (str_contains($lower, 'model') && (str_contains($lower, 'not found') || str_contains($lower, 'does not exist') || str_contains($lower, 'unsupported'))) {
            $this->fail('AI_MODEL_INVALID', "Model '{$model}' was rejected by {$provider}. Choose a valid document-capable model in AI Settings.");
        }

        if (str_contains($lower, 'rate limit') || str_contains($lower, 'quota') || str_contains($lower, '429')) {
            $this->fail('AI_RATE_LIMIT', "{$provider} rate limit or quota was reached.");
        }

        $this->fail('AI_PROVIDER_ERROR', $message ?: 'Document scan failed unexpectedly. Please check AI Settings.');
    }

    private function fail(string $code, string $message): never
    {
        throw new AiProviderException($message, $code);
    }
}
