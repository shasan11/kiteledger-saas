<?php

namespace App\Jobs\Middleware;

use App\Models\Tenant;

class InitializeTenantContext
{
    public function handle(object $job, callable $next): void
    {
        $tenant = Tenant::query()->findOrFail($job->tenantId);
        tenancy()->initialize($tenant);
        try { $next($job); } finally { if (tenancy()->initialized) tenancy()->end(); }
    }
}
