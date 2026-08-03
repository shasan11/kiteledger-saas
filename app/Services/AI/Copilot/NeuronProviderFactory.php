<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Neuron\Providers\OpenAiCompatibleEmbeddings;
use App\Neuron\Providers\OpenAiCompatibleProvider;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use NeuronAI\HttpClient\GuzzleHttpClient;
use NeuronAI\Providers\AIProviderInterface;
use NeuronAI\Providers\Anthropic\Anthropic;
use NeuronAI\Providers\Gemini\Gemini;
use NeuronAI\Providers\Ollama\Ollama;
use NeuronAI\RAG\Embeddings\EmbeddingsProviderInterface;
use NeuronAI\RAG\Embeddings\GeminiEmbeddingsProvider;
use NeuronAI\RAG\Embeddings\OllamaEmbeddingsProvider;

final class NeuronProviderFactory
{
    public function __construct(private AiSettingsService $settings) {}

    public function chat(): AIProviderInterface
    {
        $provider = $this->settings->provider();
        $client = new GuzzleHttpClient(
            timeout: $this->settings->timeoutSeconds(),
            connectTimeout: $this->settings->connectTimeoutSeconds(),
        );
        $parameters = [
            'temperature' => $this->settings->temperature(),
            'max_tokens' => $this->settings->maxTokens(),
        ];

        if ($provider === 'ollama') {
            return new Ollama(rtrim($this->settings->baseUrl(), '/').'/api', $this->settings->model(), $parameters, $client);
        }

        $key = $this->settings->apiKey();
        if (! $key) {
            throw new AiProviderException('The Copilot provider is not configured.', 'AI_PROVIDER_NOT_CONFIGURED');
        }

        return match ($provider) {
            'gemini' => new Gemini($key, $this->settings->model(), $parameters, $client, $this->settings->baseUrl()),
            'anthropic' => new Anthropic($key, $this->settings->model(), max_tokens: $this->settings->maxTokens(), parameters: $parameters, httpClient: $client),
            default => new OpenAiCompatibleProvider($key, $this->settings->model(), $this->settings->baseUrl(), $parameters, $client),
        };
    }

    public function embeddings(): EmbeddingsProviderInterface
    {
        $provider = $this->settings->embeddingProvider();
        $model = $this->settings->embeddingModel();
        $client = new GuzzleHttpClient(
            timeout: $this->settings->timeoutSeconds(),
            connectTimeout: $this->settings->connectTimeoutSeconds(),
        );

        if ($provider === 'ollama') {
            return new OllamaEmbeddingsProvider($model, rtrim($this->settings->embeddingBaseUrl(), '/').'/api', httpClient: $client);
        }

        $key = $this->settings->embeddingApiKey();
        if (! $key) {
            throw new AiProviderException('The embedding provider is not configured.', 'AI_EMBEDDING_PROVIDER_NOT_CONFIGURED');
        }

        return match ($provider) {
            'gemini' => new GeminiEmbeddingsProvider($key, $model, httpClient: $client),
            default => new OpenAiCompatibleEmbeddings($key, $model, $this->settings->embeddingBaseUrl(), $this->settings->embeddingDimensions(), $client),
        };
    }
}
