<?php

namespace Tests\Unit;

use App\Services\SaaS\DatabaseProvisioning\CpanelIdentifierNormalizer;
use PHPUnit\Framework\TestCase;

class CpanelIdentifierNormalizerTest extends TestCase
{
    public function test_it_applies_cpanel_account_prefix_once(): void
    {
        $normalizer = new CpanelIdentifierNormalizer;

        $this->assertSame('cpuser_tenant_a', $normalizer->normalizeDatabase('tenant_a', 'cpuser'));
        $this->assertSame('cpuser_tenant_a', $normalizer->normalizeDatabase('cpuser_tenant_a', 'cpuser'));
        $this->assertSame('cpuser_dbuser', $normalizer->normalizeUser('dbuser', 'cpuser'));
        $this->assertSame('dbuser', $normalizer->normalizeUser('dbuser', ''));
    }
}
