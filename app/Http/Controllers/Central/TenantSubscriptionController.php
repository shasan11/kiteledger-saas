<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TenantSubscriptionController extends Controller
{
    public function store(Request $request, Tenant $tenant, SubscriptionService $subscriptions, CentralAuditService $audit)
    {
        abort_if($tenant->subscription()->exists(), 409, 'This customer already has a subscription.');

        $data = $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
            'mode' => ['required', Rule::in(['auto', 'trial', 'active'])],
            'effective_at' => ['nullable', 'date'],
        ]);

        $subscription = $subscriptions->start(
            $tenant,
            Plan::findOrFail($data['plan_id']),
            $data['billing_cycle'],
            $data['mode'],
            $data['effective_at'] ?? null,
        );

        $audit->log($request, 'tenant.subscription.started', $tenant, [], $subscription->only(['id', 'plan_id', 'status', 'billing_cycle', 'current_period_ends_at']));

        return back()->with('success', 'Subscription started.');
    }

    public function changePlan(Request $request, Tenant $tenant, SubscriptionService $subscriptions, CentralAuditService $audit)
    {
        $subscription = $tenant->subscription()->firstOrFail();
        $data = $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
            'immediate' => ['boolean'],
        ]);

        $old = $subscription->only(['plan_id', 'scheduled_plan_id', 'status']);
        $subscriptions->changePlan($subscription, Plan::findOrFail($data['plan_id']), (bool) ($data['immediate'] ?? false));
        $audit->log($request, 'tenant.subscription.plan_changed', $tenant, $old, $subscription->fresh()->only(['plan_id', 'scheduled_plan_id', 'status']));

        return back()->with('success', ($data['immediate'] ?? false)
            ? 'Plan changed.'
            : 'Plan change scheduled for the end of the current period.');
    }
}
