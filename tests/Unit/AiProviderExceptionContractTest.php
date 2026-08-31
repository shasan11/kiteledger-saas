<?php

namespace Tests\Unit;

use App\Services\AI\AiProviderException;
use PHPUnit\Framework\TestCase;

class AiProviderExceptionContractTest extends TestCase
{
    public function test_public_payload_never_exposes_raw_provider_details(): void
    {
        $exception = new AiProviderException(
            'OpenAI model secret-model at https://internal.example failed with sk-secret and stack trace',
            'AI_TIMEOUT',
        );

        $payload = $exception->toArray();

        $this->assertSame('AI_TIMEOUT', $payload['code']);
        $this->assertSame(504, $exception->httpStatus());
        $this->assertStringNotContainsString('OpenAI', $payload['message']);
        $this->assertStringNotContainsString('secret-model', $payload['message']);
        $this->assertStringNotContainsString('sk-secret', $payload['message']);
    }
}
