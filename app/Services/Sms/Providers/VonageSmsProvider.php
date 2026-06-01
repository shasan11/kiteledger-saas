<?php

namespace App\Services\Sms\Providers;

use App\Models\SmsConfig;
use App\Services\Sms\SmsResult;
use Illuminate\Support\Facades\Http;

class VonageSmsProvider
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult
    {
        if (!$config->api_key || !$config->api_secret) {
            return SmsResult::fail('vonage', 'Vonage is missing API key or API secret.');
        }

        try {
            $response = Http::timeout(20)->post('https://rest.nexmo.com/sms/json', [
                'api_key' => $config->api_key,
                'api_secret' => $config->api_secret,
                'from' => $config->sender_id ?: $config->from_number ?: 'KiteLedger',
                'to' => $to,
                'text' => $message,
            ]);

            $payload = $response->json() ?? ['body' => $response->body()];
            $status = (string) data_get($payload, 'messages.0.status', '0');
            if ($response->failed() || $status !== '0') {
                return SmsResult::fail('vonage', data_get($payload, 'messages.0.error-text', 'Vonage request failed.'), $payload, $status, $response->status());
            }

            return SmsResult::ok('vonage', data_get($payload, 'messages.0.message-id'), $payload, $response->status());
        } catch (\Throwable $e) {
            return SmsResult::fail('vonage', $e->getMessage());
        }
    }
}
