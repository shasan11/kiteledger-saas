<?php

namespace App\Services\Sms;

use App\Models\SmsConfig;
use Illuminate\Support\Facades\Http;

class InfobipDriver implements SmsDriverInterface
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult
    {
        $apiKey = $config->api_key;
        $baseUrl = rtrim((string) $config->base_url, '/');
        $sender = $config->sender_id ?: $config->from_number;

        if (!$apiKey || !$baseUrl || !$sender) {
            return SmsResult::fail('infobip', 'Infobip is missing api_key, base_url, or sender_id.');
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => "App {$apiKey}",
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])
                ->timeout(15)
                ->post("{$baseUrl}/sms/2/text/advanced", [
                    'messages' => [[
                        'from' => $sender,
                        'destinations' => [['to' => $to]],
                        'text' => $message,
                    ]],
                ]);

            if ($response->failed()) {
                return SmsResult::fail(
                    'infobip',
                    $response->json('requestError.serviceException.text') ?? 'Infobip request failed.'
                );
            }

            $messageId = $response->json('messages.0.messageId');

            return SmsResult::ok('infobip', $messageId);
        } catch (\Throwable $e) {
            return SmsResult::fail('infobip', $e->getMessage());
        }
    }
}
