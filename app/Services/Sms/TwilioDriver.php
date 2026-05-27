<?php

namespace App\Services\Sms;

use App\Models\SmsConfig;
use Illuminate\Support\Facades\Http;

class TwilioDriver implements SmsDriverInterface
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult
    {
        $sid = $config->account_sid;
        $token = $config->auth_token;
        $from = $config->from_number;

        if (!$sid || !$token || !$from) {
            return SmsResult::fail('twilio', 'Twilio is missing account_sid, auth_token, or from_number.');
        }

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

        try {
            $response = Http::withBasicAuth($sid, $token)
                ->asForm()
                ->timeout(15)
                ->post($url, [
                    'From' => $from,
                    'To' => $to,
                    'Body' => $message,
                ]);

            if ($response->failed()) {
                return SmsResult::fail('twilio', $response->json('message') ?? 'Twilio request failed.');
            }

            return SmsResult::ok('twilio', $response->json('sid'));
        } catch (\Throwable $e) {
            return SmsResult::fail('twilio', $e->getMessage());
        }
    }
}
