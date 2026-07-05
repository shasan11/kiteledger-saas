<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class BindSessionToTenant
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->hasSession() || ! tenant()) {
            return $next($request);
        }
        $impersonation = $request->session()->get('impersonation');
        if ($impersonation && Carbon::parse($impersonation['expires_at'])->isPast()) {
            Auth::logout();
            $request->session()->invalidate();

            return $request->expectsJson() ? response()->json(['message' => 'Impersonation expired.'], 401) : redirect()->away(config('app.url'));
        }
        $bound = $request->session()->get('_tenant_id');
        if ($bound !== null && ! hash_equals((string) $bound, (string) tenant()->id)) {
            $request->session()->invalidate();

            return $request->expectsJson() ? response()->json(['message' => 'Tenant session mismatch.', 'code' => 'session_tenant_mismatch'], 401) : abort(419);
        }
        $request->session()->put('_tenant_id', tenant()->id);

        return $next($request);
    }
}
