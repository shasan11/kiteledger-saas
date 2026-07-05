<?php

namespace App\Http\Middleware;

use App\Services\SaaS\PlanLimitService;
use Closure;
use Illuminate\Http\Request;

class EnsurePlanLimitNotExceeded
{
    public function __construct(private PlanLimitService $limits) {}

    public function handle(Request $request, Closure $next, string $resource)
    {
        $this->limits->assertCanCreate(tenant(), $resource);

        return $next($request);
    }
}
