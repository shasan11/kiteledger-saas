<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

class TenantModelIsolationContractTest extends TestCase
{
    public function test_every_non_central_model_requires_tenancy(): void
    {
        $missing = [];
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(dirname(__DIR__, 2).'/app/Models'));
        foreach ($iterator as $file) {
            if (! $file->isFile() || $file->getExtension() !== 'php' || str_contains($file->getPathname(), DIRECTORY_SEPARATOR.'Central'.DIRECTORY_SEPARATOR) || str_contains($file->getPathname(), DIRECTORY_SEPARATOR.'Concerns'.DIRECTORY_SEPARATOR)) {
                continue;
            }
            $contents = file_get_contents($file->getPathname());
            if (preg_match('/^class .* extends /m', $contents) && ! str_contains($contents, 'RequiresTenantConnection')) {
                $missing[] = $file->getFilename();
            }
        }
        $this->assertSame([], $missing, 'Tenant models missing the fail-closed concern: '.implode(', ', $missing));
    }
}
