<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureSubscriptionIsValid
{
    public function handle(Request $request, Closure $next)
    {
        if (! tenant() && app()->environment('testing') && config('saas.allow_uninitialized_tenant_models')) {
            return $next($request);
        }

        $tenant = tenant();
        $subscription = $tenant?->subscription;
        $freePlan = $tenant?->plan && (float) $tenant->plan->price_monthly === 0.0 && (float) $tenant->plan->price_yearly === 0.0;
        if (! $tenant?->is_internal && ! $freePlan && (! $subscription || ! $subscription->isValid())) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'An active subscription is required.', 'code' => 'subscription_required'], 402);
            }

            abort(402, 'An active subscription is required.');
        }

        return $next($request);
    }
}
