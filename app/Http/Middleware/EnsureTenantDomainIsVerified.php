<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantDomainIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower(rtrim(trim($request->getHost()), '.'));
        $domain = tenant()?->domains()->whereRaw('LOWER(domain) = ?', [$host])->first();

        abort_unless(
            $domain
            && $domain->status === 'active'
            && $domain->verification_status === 'verified'
            && $domain->verified_at !== null
            && $domain->disabled_at === null,
            404,
        );

        return $next($request);
    }
}
