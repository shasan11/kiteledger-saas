<?php

namespace App\Http\Middleware;

use App\Models\Central\CentralUser;
use App\Services\SaaS\TenantAccessService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for the customer account portal. Uses the dedicated `platform` guard so
 * tenant and central-admin sessions are never mixed in.
 */
class EnsurePlatformUser
{
    public function __construct(private readonly TenantAccessService $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('platform');
        if (! $user instanceof CentralUser) {
            return $this->reject($request, 'Please sign in to continue.');
        }
        if (! $user->isPlatformActive()) {
            return $this->reject($request, 'This account is not active. Contact KiteLedger support.');
        }
        // "Sign out everywhere" works on any session driver: sessions opened
        // before the invalidation stamp are refused on their next request.
        $loggedInAt = (int) $request->session()->get('platform_login_at', 0);
        if ($user->sessions_invalidated_at && $user->sessions_invalidated_at->getTimestamp() > $loggedInAt) {
            return $this->reject($request, 'Your session has ended. Please sign in again.');
        }

        Auth::shouldUse('platform');
        $request->attributes->set('platformUser', $user);

        if ($user->force_password_reset && ! $request->routeIs('*account.password.force*', '*account.logout')) {
            return redirect()->route('central.account.password.force');
        }

        $this->touchActivity($user);
        $this->clearRevokedActiveTenant($request, $user);

        return $next($request);
    }

    private function reject(Request $request, string $message): Response
    {
        Auth::guard('platform')->logout();
        if ($request->session()->isStarted()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $request->expectsJson()
            ? response()->json(['message' => $message], 401)
            : redirect()->route('central.account.login')->withErrors(['email' => $message]);
    }

    private function touchActivity(CentralUser $user): void
    {
        if (! $user->last_active_at || $user->last_active_at->lt(now()->subMinutes(5))) {
            $user->forceFill(['last_active_at' => now()])->saveQuietly();
        }
    }

    private function clearRevokedActiveTenant(Request $request, CentralUser $user): void
    {
        $activeTenantId = $request->session()->get('platform_active_tenant_id');
        if ($activeTenantId && ! $this->access->canAccessTenant($user, $activeTenantId)) {
            $request->session()->forget('platform_active_tenant_id');
        }
    }
}
