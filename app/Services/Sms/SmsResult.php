<?php

namespace App\Services\Sms;

class SmsResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
        public readonly ?string $provider = null,
    ) {}

    public static function ok(string $provider, ?string $messageId = null): self
    {
        return new self(true, $messageId, null, $provider);
    }

    public static function fail(string $provider, string $error): self
    {
        return new self(false, null, $error, $provider);
    }
}
