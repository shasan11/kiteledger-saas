<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantDomainIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower(rtrim($request->getHost(), '.'));
        $domain = tenant()?->domains()->whereRaw('LOWER(domain) = ?', [$host])->first();
        $status = $domain?->verification_status ?: $domain?->status;

        abort_unless($domain && $domain->verified_at && in_array($status, ['verified', 'active'], true), 404);

        return $next($request);
    }
}
