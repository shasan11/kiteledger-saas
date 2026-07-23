<?php

namespace App\Services\Tenancy;

use Illuminate\Support\Str;

class TenantStorageService
{
    public function path(string $path = ''): string
    {
        abort_unless(tenancy()->initialized && tenant(), 500, 'Tenant storage requires an initialized tenant.');
        $relative = str_replace('\\', '/', ltrim($path, '/\\'));
        abort_if(Str::contains($relative, ['../', "\0"]), 400, 'Invalid tenant storage path.');

        return storage_path('app/tenant'.tenant()->getTenantKey().($relative === '' ? '' : '/'.$relative));
    }
}
