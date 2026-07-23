<?php

namespace App\Services\Tenancy;

use Illuminate\Support\Str;

class TenantDatabaseName
{
    public function fromSlug(string $slug): string
    {
        $prefix = preg_replace('/[^a-z0-9_]/', '_', strtolower((string) config('saas.database.prefix', 'tenant_')));
        $safe = trim(preg_replace('/[^a-z0-9_]/', '_', Str::slug($slug, '_')), '_');
        abort_if($safe === '', 422, 'The tenant slug cannot produce a safe database name.');

        return substr($prefix.$safe.'_'.Str::lower(Str::random(8)), 0, 64);
    }
}
