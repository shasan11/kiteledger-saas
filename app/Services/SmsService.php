<?php

namespace App\Services;

use App\Models\SmsConfig;
use App\Services\Sms\InfobipDriver;
use App\Services\Sms\SmsDriverInterface;
use App\Services\Sms\SmsResult;
use App\Services\Sms\TwilioDriver;
use RuntimeException;

/**
 * Resolves an active SmsConfig and dispatches a message via the appropriate
 * provider driver. Consumers should treat a failed SmsResult as a non-fatal
 * outcome (log, surface to user) — the service never throws on send failure.
 */
class SmsService
{
    public function send(string $to, string $message, ?SmsConfig $config = null): SmsResult
    {
        $config = $config ?? $this->resolveActiveConfig();

        if (!$config) {
            return SmsResult::fail('none', 'No active SMS provider configured.');
        }

        return $this->driverFor($config)->send($config, $to, $message);
    }

    public function resolveActiveConfig(): ?SmsConfig
    {
        return SmsConfig::query()
            ->where('active', true)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->first();
    }

    public function driverFor(SmsConfig $config): SmsDriverInterface
    {
        return match ($config->provider) {
            SmsConfig::PROVIDER_TWILIO => app(TwilioDriver::class),
            SmsConfig::PROVIDER_INFOBIP => app(InfobipDriver::class),
            default => throw new RuntimeException("Unsupported SMS provider: {$config->provider}"),
        };
    }
}
