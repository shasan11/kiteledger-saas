<?php

namespace App\Http\Middleware;

use App\Services\SaaS\PlanLimitService;
use Closure;
use Illuminate\Http\Request;

class EnsureFeatureIsAllowed
{
    public function __construct(private PlanLimitService $limits) {}

    public function handle(Request $request, Closure $next, string $feature)
    {
        $this->limits->assertFeature(tenant(), $feature);

        return $next($request);
    }
}
