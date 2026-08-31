<?php

declare(strict_types=1);

namespace App\Neuron\Providers;

use NeuronAI\HttpClient\HttpClientInterface;
use NeuronAI\Providers\OpenAI\OpenAI;

final class OpenAiCompatibleProvider extends OpenAI
{
    public function __construct(string $key, string $model, string $baseUrl, array $parameters = [], ?HttpClientInterface $httpClient = null)
    {
        $this->baseUri = rtrim($baseUrl, '/');
        parent::__construct($key, $model, $parameters, false, $httpClient);
    }
}
