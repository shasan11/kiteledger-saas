<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use Illuminate\Support\Str;

class TenantDatabaseNameGenerator
{
    public function __construct(private TenantDatabaseNameValidator $validator) {}

    public function generate(?string $slug = null): string
    {
        $prefix = $this->cleanFragment((string) config('tenancy.database.prefix', 'tenant_'), false);
        $suffix = $this->cleanFragment((string) config('tenancy.database.suffix', ''), false);
        $base = $this->cleanFragment($slug ?: 'tenant');
        $randomLength = 12;
        $availableBaseLength = max(1, 64 - strlen($prefix) - strlen($suffix) - $randomLength - 1);
        $base = substr($base ?: 'tenant', 0, $availableBaseLength);

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $name = $prefix.$base.'_'.Str::lower(Str::random($randomLength)).$suffix;
            $this->validator->assertValid($name);

            if (! Tenant::query()->where('database_name', $name)->exists()
                && ! TenantDatabasePool::query()->where('database_name', $name)->exists()) {
                return $name;
            }
        }

        throw new \RuntimeException('database_name_collision');
    }

    public function temporaryProbeName(): string
    {
        $prefix = $this->cleanFragment((string) config('tenancy.database.prefix', 'tenant_'), false);
        $name = substr($prefix.'probe_'.Str::lower(Str::random(16)), 0, 64);
        $this->validator->assertValid($name);

        return $name;
    }

    private function cleanFragment(string $value, bool $trim = true): string
    {
        $cleaned = preg_replace('/[^A-Za-z0-9_]/', '_', $value) ?? '';
        if ($trim) {
            $cleaned = trim($cleaned, '_');
        }

        return $cleaned === '' ? '' : $cleaned;
    }
}
