<?php

namespace App\Services\AI;

use RuntimeException;

class AiProviderException extends RuntimeException
{
    public function __construct(string $message, protected string $errorCode = 'AI_PROVIDER_ERROR')
    {
        parent::__construct($message);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function toArray(): array
    {
        return [
            'message' => $this->publicMessage(),
            'code' => $this->errorCode,
        ];
    }

    public function publicMessage(): string
    {
        return match ($this->errorCode) {
            'AI_DISABLED' => 'AI features are currently disabled.',
            'AI_API_KEY_MISSING', 'AI_PROVIDER_NOT_CONFIGURED', 'AI_PROVIDER_AUTH_FAILED' => 'The shared AI provider is not ready. Ask the platform administrator to check its connection.',
            'AI_MODEL_MISSING', 'AI_MODEL_INVALID', 'AI_PROVIDER_UNSUPPORTED', 'AI_VISION_UNSUPPORTED' => 'The selected AI model does not support this request. Ask the platform administrator to review model capabilities.',
            'AI_RATE_LIMIT' => 'The AI service is busy right now. Please try again in a few minutes.',
            'AI_TIMEOUT' => 'The AI service took too long to respond. Try a shorter request or try again.',
            'AI_SSL_CERTIFICATE_ERROR' => 'The server could not establish a secure connection to the AI service. Ask the platform administrator to check the CA certificate configuration.',
            'AI_PROVIDER_OVERLOADED', 'AI_PROVIDER_UNAVAILABLE' => 'The AI service is temporarily unavailable. Please try again shortly.',
            default => 'The AI service could not complete the request. Please try again.',
        };
    }

    public function httpStatus(): int
    {
        return match ($this->errorCode) {
            'AI_RATE_LIMIT' => 429,
            'AI_TIMEOUT' => 504,
            'AI_DISABLED', 'AI_API_KEY_MISSING', 'AI_PROVIDER_NOT_CONFIGURED',
            'AI_PROVIDER_AUTH_FAILED', 'AI_MODEL_MISSING', 'AI_MODEL_INVALID',
            'AI_SSL_CERTIFICATE_ERROR', 'AI_PROVIDER_OVERLOADED', 'AI_PROVIDER_UNAVAILABLE' => 503,
            default => 502,
        };
    }
}
