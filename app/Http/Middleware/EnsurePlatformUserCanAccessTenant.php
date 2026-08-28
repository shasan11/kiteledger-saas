<?php

namespace App\Http\Middleware;

use App\Models\Central\CentralUser;
use App\Services\SaaS\TenantAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves {tenant} strictly through the signed-in platform user's active
 * memberships. Editing the URL to another company yields 403, never data.
 *
 * Extra arguments are membership permission flags that must also be granted,
 * e.g. `platform.tenant:can_manage_billing`.
 */
class EnsurePlatformUserCanAccessTenant
{
    public function __construct(private readonly TenantAccessService $access) {}

    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->attributes->get('platformUser') ?? $request->user('platform');
        abort_unless($user instanceof CentralUser && $user->isPlatformActive(), 403);

        $tenantId = (string) $request->route('tenant');
        $tenant = $this->access->resolveAccessibleTenant($user, $tenantId);
        abort_unless($tenant !== null, 403, 'You do not have access to this company.');

        $membership = $this->access->getMembership($user, $tenant);
        abort_unless($membership?->isUsable(), 403, 'Your access to this company has been revoked.');

        foreach ($permissions as $permission) {
            abort_unless($membership->grants($permission), 403);
        }

        $request->attributes->set('platformTenant', $tenant);
        $request->attributes->set('platformMembership', $membership);
        $request->route()->setParameter('tenant', $tenant->getKey());

        return $next($request);
    }
}
