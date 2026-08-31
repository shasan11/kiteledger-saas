<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AiSslVerificationContractTest extends TestCase
{
    public function test_every_ai_client_restricts_disabled_tls_verification_to_local_or_testing(): void
    {
        foreach ([
            'app/Services/AI/AiProviderManager.php',
            'app/Services/AI/Copilot/NeuronProviderFactory.php',
            'app/Services/Documents/DocumentAiClient.php',
        ] as $file) {
            $source = file_get_contents(dirname(__DIR__, 2).'/'.$file);
            $this->assertStringContainsString("app()->environment(['local', 'testing'])", $source, $file);
            $this->assertStringContainsString("config('ai.ssl.ca_bundle'", $source, $file);
        }
    }
}
