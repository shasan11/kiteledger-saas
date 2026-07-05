<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EnsureTenantIsActive
{
    public function handle(Request $request, Closure $next)
    {
        if (! tenant() && app()->environment('testing') && config('saas.allow_uninitialized_tenant_models')) {
            return $next($request);
        }

        $tenant = tenant();
        if (! $tenant) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Tenant context is required.', 'code' => 'tenant_not_found'], 404)
                : abort(404);
        }
        if (! $tenant->isOperational()) {
            $status = in_array($tenant->status, ['pending', 'provisioning', 'provisioning_failed'], true) ? 503 : 423;
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Tenant access is unavailable.', 'code' => $status === 423 ? 'tenant_locked' : 'tenant_unavailable'], $status);
            }

            return Inertia::render('Tenant/Suspended', ['tenant' => ['company_name' => $tenant->company_name, 'status' => $tenant->status, 'reason' => $tenant->status_reason]])->toResponse($request)->setStatusCode($status);
        }

        return $next($request);
    }
}
