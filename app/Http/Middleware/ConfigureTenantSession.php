<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ConfigureTenantSession
{
    /**
     * Isolate browser sessions per tenant before StartSession and CSRF run.
     *
     * Host-only cookies prevent one subdomain from authenticating against
     * another. A tenant-specific name also makes stale parent-domain cookies
     * from older deployments harmless instead of causing a 419 response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! tenant()) {
            return $next($request);
        }

        $original = [
            'session.cookie' => config('session.cookie'),
            'session.domain' => config('session.domain'),
            'session.connection' => config('session.connection'),
        ];
        $prefix = rtrim((string) config('session.tenant_cookie_prefix', 'kiteledger-tenant-session'), '-');
        $tenantKey = substr(hash('sha256', (string) tenant()->getTenantKey()), 0, 16);

        config([
            'session.cookie' => $prefix.'-'.$tenantKey,
            'session.domain' => null,
            'session.connection' => config('tenancy.database.central_connection', 'central'),
        ]);

        try {
            return $next($request);
        } finally {
            // Avoid leaking tenant-specific runtime config into long-lived workers.
            config($original);
        }
    }
}
