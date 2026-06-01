<?php

namespace App\Services\Sms\Providers;

use App\Models\SmsConfig;
use App\Services\Sms\SmsResult;
use Illuminate\Support\Facades\Http;

class SparrowSmsProvider
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult
    {
        $token = $config->auth_token ?: $config->api_key;
        $from = $config->sender_id ?: $config->from_number;

        if (!$token || !$from) {
            return SmsResult::fail('sparrow_sms', 'Sparrow SMS is missing token or sender ID.');
        }

        try {
            $response = Http::timeout(20)->asForm()->post($config->api_base_url ?: 'https://api.sparrowsms.com/v2/sms/', [
                'token' => $token,
                'from' => $from,
                'to' => $to,
                'text' => $message,
            ]);

            $payload = $response->json() ?? ['body' => $response->body()];
            if ($response->failed()) {
                return SmsResult::fail('sparrow_sms', data_get($payload, 'response', 'Sparrow SMS request failed.'), $payload, null, $response->status());
            }

            return SmsResult::ok('sparrow_sms', data_get($payload, 'message_id'), $payload, $response->status());
        } catch (\Throwable $e) {
            return SmsResult::fail('sparrow_sms', $e->getMessage());
        }
    }
}
