<?php

namespace App\Http\Middleware;

use App\Services\Tenancy\TenantFeatureService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceTenantLimit
{
    public function __construct(private TenantFeatureService $features) {}

    public function handle(Request $request, Closure $next, string $feature, ?string $usageKey = null): Response
    {
        $limit = tenant() ? $this->features->limit(tenant(), $feature) : null;
        $usage = (int) ($request->attributes->get($usageKey ?: $feature.'_usage', 0));
        abort_if($limit !== null && $usage >= $limit, 422, 'The tenant plan limit has been reached.');

        return $next($request);
    }
}
