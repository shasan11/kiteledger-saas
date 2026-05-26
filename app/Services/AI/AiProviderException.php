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
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
        ];
    }
}
