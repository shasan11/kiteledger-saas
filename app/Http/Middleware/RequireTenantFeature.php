<?php

namespace App\Http\Middleware;

use App\Services\Tenancy\TenantFeatureService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireTenantFeature
{
    public function __construct(private TenantFeatureService $features) {}

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        abort_unless(tenant() && $this->features->allowed(tenant(), $feature), 403, 'This feature is not available for the active tenant.');

        return $next($request);
    }
}
