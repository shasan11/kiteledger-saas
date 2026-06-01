<?php

namespace App\Services\Sms\Providers;

use App\Models\SmsConfig;
use App\Services\Sms\SmsResult;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;

class CustomHttpSmsProvider
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult
    {
        $provider = $this->defaultProvider();
        $endpoint = $this->defaultEndpoint($config);

        if (!$endpoint) {
            return SmsResult::fail($provider, 'Custom SMS endpoint URL is required.');
        }

        $metadata = $config->metadata ?: [];
        $method = strtolower((string) ($metadata['method'] ?? ($config->provider === SmsConfig::PROVIDER_CUSTOM_GET ? 'get' : 'post')));
        $headers = Arr::wrap($metadata['headers'] ?? []);
        $payload = Arr::wrap($metadata['payload'] ?? []);
        $phoneKey = $metadata['phone_param'] ?? 'to';
        $messageKey = $metadata['message_param'] ?? 'message';
        $senderKey = $metadata['sender_param'] ?? 'sender';

        $payload[$phoneKey] = $to;
        $payload[$messageKey] = $message;
        if ($config->sender_id || $config->from_number) {
            $payload[$senderKey] = $config->sender_id ?: $config->from_number;
        }
        if ($config->api_key && !array_key_exists('api_key', $payload)) {
            $payload['api_key'] = $config->api_key;
        }
        if ($config->api_secret && !array_key_exists('api_secret', $payload)) {
            $payload['api_secret'] = $config->api_secret;
        }

        try {
            $request = Http::withHeaders($headers)->timeout(20);
            $response = $method === 'get'
                ? $request->get($endpoint, $payload)
                : $request->post($endpoint, $payload);

            $body = $response->json() ?? ['body' => $response->body()];
            if ($response->failed()) {
                return SmsResult::fail($provider, data_get($body, 'message', 'SMS provider request failed.'), $body, null, $response->status());
            }

            return SmsResult::ok($provider, data_get($body, 'message_id') ?: data_get($body, 'id'), $body, $response->status());
        } catch (\Throwable $e) {
            return SmsResult::fail($provider, $e->getMessage());
        }
    }

    protected function defaultProvider(): string
    {
        return 'custom_http';
    }

    protected function defaultEndpoint(SmsConfig $config): string
    {
        return (string) ($config->api_base_url ?: $config->base_url);
    }
}
