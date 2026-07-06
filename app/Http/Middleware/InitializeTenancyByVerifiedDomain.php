<?php

namespace App\Http\Middleware;

use App\Enums\DomainStatus;
use App\Models\Central\Domain;
use App\Support\Installer\InstalledState;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use PDOException;
use Symfony\Component\HttpFoundation\Response;

class InitializeTenancyByVerifiedDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        // An unconfigured central domain can otherwise fall through to tenant
        // routing and query the domains table before the installer creates it.
        if (! InstalledState::isInstalled()) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Application is not installed.'], 503)
                : redirect(InstalledState::hasInstallLock() ? '/install/recover' : '/install');
        }

        $host = strtolower(rtrim($request->getHost(), '.'));
        if (in_array($host, array_map('strtolower', config('tenancy.central_domains', [])), true)) {
            return $this->notFound($request);
        }

        try {
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
        } catch (QueryException|PDOException) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Database configuration is invalid or the database is unavailable.'], 503)
                : response()->view('vendor.installer.recover', [
                    'problems' => ['Database configuration is invalid or the database is unavailable. Verify .env and remove stale Laravel config cache.'],
                    'hasStaleConfigCache' => is_file(base_path('bootstrap/cache/config.php')),
                    'resetAllowed' => false,
                ], 503);
        }

        return $next($request);
    }

    private function notFound(Request $request): Response
    {
        return $request->expectsJson()
            ? response()->json(['message' => 'Tenant domain was not found.', 'code' => 'tenant_not_found'], 404)
            : response()->view('errors.404', [], 404);
    }
}
