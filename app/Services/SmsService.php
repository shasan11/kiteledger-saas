<?php

namespace App\Services;

use App\Models\SmsConfig;
use App\Services\Sms\SmsConfigResolver;
use App\Services\Sms\SmsSender;
use App\Services\Sms\SmsResult;

/**
 * Resolves an active SmsConfig and dispatches a message via the appropriate
 * provider driver. Consumers should treat a failed SmsResult as a non-fatal
 * outcome (log, surface to user) — the service never throws on send failure.
 */
class SmsService
{
    public function __construct(private readonly SmsSender $sender, private readonly SmsConfigResolver $resolver)
    {
    }

    public function send(string $to, string $message, ?SmsConfig $config = null, array $options = []): SmsResult
    {
        if ($config) {
            $options['config'] = $config;
        }

        return $this->sender->send($to, $message, $options);
    }

    public function resolveActiveConfig(): ?SmsConfig
    {
        return $this->resolver->activeDefault();
    }
}
