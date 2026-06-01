<?php

namespace App\Services\Sms;

class SmsResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
        public readonly ?string $provider = null,
        public readonly array|string|null $providerResponse = null,
        public readonly ?string $errorCode = null,
        public readonly ?int $statusCode = null,
        public readonly ?string $smsLogId = null,
    ) {}

    public static function ok(string $provider, ?string $messageId = null, array|string|null $providerResponse = null, ?int $statusCode = null): self
    {
        return new self(true, $messageId, null, $provider, $providerResponse, null, $statusCode);
    }

    public static function fail(string $provider, string $error, array|string|null $providerResponse = null, ?string $errorCode = null, ?int $statusCode = null): self
    {
        return new self(false, null, $error, $provider, $providerResponse, $errorCode, $statusCode);
    }
}
