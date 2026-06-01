<?php

namespace App\Services\Sms\Providers;

use App\Models\SmsConfig;
use App\Services\Sms\SmsResult;
use Illuminate\Support\Facades\Http;

class TwilioSmsProvider
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult
    {
        $sid = $config->account_sid ?: $config->username;
        $token = $config->auth_token ?: $config->api_secret;
        $from = $config->from_number ?: $config->sender_id;

        if (!$sid || !$token || !$from) {
            return SmsResult::fail('twilio', 'Twilio is missing account SID, auth token, or from number.');
        }

        try {
            $response = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->timeout(20)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                    'From' => $from,
                    'To' => $to,
                    'Body' => $message,
                ]);

            $payload = $response->json() ?? ['body' => $response->body()];
            if ($response->failed()) {
                return SmsResult::fail('twilio', data_get($payload, 'message', 'Twilio request failed.'), $payload, data_get($payload, 'code'), $response->status());
            }

            return SmsResult::ok('twilio', data_get($payload, 'sid'), $payload, $response->status());
        } catch (\Throwable $e) {
            return SmsResult::fail('twilio', $e->getMessage());
        }
    }
}
