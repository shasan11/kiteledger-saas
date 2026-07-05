<?php

namespace App\Http\Middleware;

use App\Enums\DomainStatus;
use App\Models\Central\Domain;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InitializeTenancyByVerifiedDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower(rtrim($request->getHost(), '.'));
        if (in_array($host, array_map('strtolower', config('tenancy.central_domains', [])), true)) {
            return $this->notFound($request);
        }

        $domain = Domain::query()->with('tenant')->whereRaw('LOWER(domain) = ?', [$host])->first();
        if (! $domain || $domain->status !== DomainStatus::Active->value || ! $domain->verified_at || ! $domain->tenant) {
            return $this->notFound($request);
        }

        $primary = $domain->tenant->domains()->where('status', DomainStatus::Active->value)->whereNotNull('verified_at')->where('is_primary', true)->first();
        if (! $domain->is_primary && $primary && $primary->domain !== $host) {
            $url = $request->getScheme().'://'.$primary->domain.$request->getRequestUri();

            return redirect()->away($url, 308);
        }

        tenancy()->initialize($domain->tenant);

        return $next($request);
    }

    private function notFound(Request $request): Response
    {
        return $request->expectsJson()
            ? response()->json(['message' => 'Tenant domain was not found.', 'code' => 'tenant_not_found'], 404)
            : response()->view('errors.404', [], 404);
    }
}
