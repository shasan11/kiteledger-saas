<?php

declare(strict_types=1);

namespace App\Neuron\Providers;

use NeuronAI\HttpClient\HttpClientInterface;
use NeuronAI\RAG\Embeddings\OpenAIEmbeddingsProvider;

final class OpenAiCompatibleEmbeddings extends OpenAIEmbeddingsProvider
{
    public function __construct(string $key, string $model, string $baseUrl, ?int $dimensions = null, ?HttpClientInterface $httpClient = null)
    {
        $this->baseUri = rtrim($baseUrl, '/');
        parent::__construct($key, $model, $dimensions, $httpClient);
    }
}
