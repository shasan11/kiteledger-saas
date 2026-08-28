<?php

namespace App\Http\Controllers\Platform;

use App\Contracts\SaaS\SubscriptionLifecycle;
use App\Http\Controllers\Controller;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\Plan;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use App\Models\Central\TenantUsageMetric;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\TenantAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Tenant-scoped billing for platform users. Every query derives its tenant id
 * from the membership-resolved tenant, never from request input, so one
 * customer can never read another company's subscription, invoices or payments.
 */
class BillingController extends Controller
{
    private const PER_PAGE = 15;

    public function index(Request $request, TenantAccessService $access)
    {
        $tenant = $this->tenant($request);
        $this->authorize('manageBilling', $tenant);
        $subscription = Subscription::with('plan:id,name,slug,price_monthly,price_yearly,currency')->where('tenant_id', $tenant->getKey())->latest('id')->first();
        $abilities = $access->abilities($request->user('platform'), $tenant);

        return Inertia::render('Platform/Tenants/Billing', [
            'tenant' => ['id' => $tenant->getKey(), 'company_name' => $tenant->company_name, 'currency' => $tenant->currency],
            'abilities' => $abilities,
            'subscription' => $subscription,
            'plans' => $abilities['can_manage_plan'] ? Plan::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'slug', 'description', 'price_monthly', 'price_yearly', 'currency', 'trial_days', 'max_users', 'max_branches', 'max_products', 'max_invoices_per_month', 'max_storage_mb']) : [],
            'usage' => TenantUsageMetric::where('tenant_id', $tenant->getKey())->latest('period_start')->first(),
            'invoices' => $abilities['can_view_invoices']
                ? TenantInvoice::where('tenant_id', $tenant->getKey())->latest('id')->paginate(self::PER_PAGE, ['id', 'invoice_number', 'status', 'total', 'paid_amount', 'balance', 'currency', 'issue_date', 'due_date', 'paid_at'], 'invoices')->withQueryString()
                : null,
            'payments' => $abilities['can_view_invoices']
                ? PaymentTransaction::where('tenant_id', $tenant->getKey())->with('invoice:id,invoice_number')->latest('id')->paginate(self::PER_PAGE, ['id', 'invoice_id', 'gateway', 'amount', 'currency', 'status', 'payment_method', 'paid_at'], 'payments')->withQueryString()
                : null,
        ]);
    }

    /**
     * Plan changes go through the shared subscription lifecycle service so
     * proration, scheduling and audit trails stay identical to the admin path.
     */
    public function changePlan(Request $request, SubscriptionLifecycle $subscriptions, CentralAuditService $audit)
    {
        $tenant = $this->tenant($request);
        $this->authorize('managePlan', $tenant);
        $data = $request->validate([
            'plan_id' => ['required', 'integer', Rule::exists('plans', 'id')->where('is_active', true)],
            'timing' => ['required', Rule::in(['immediate', 'period_end'])],
        ]);
        $subscription = Subscription::where('tenant_id', $tenant->getKey())->latest('id')->firstOrFail();
        $plan = Plan::findOrFail($data['plan_id']);
        $old = ['plan_id' => $subscription->plan_id, 'scheduled_plan_id' => $subscription->scheduled_plan_id];
        $updated = $subscriptions->changePlan($subscription, $plan, $data['timing'] === 'immediate');
        $audit->log($request, 'subscription.changed_by_platform_user', $updated, $old, ['plan_id' => $updated->plan_id, 'scheduled_plan_id' => $updated->scheduled_plan_id, 'timing' => $data['timing']], ['tenant_id' => $tenant->getKey()]);

        return back()->with('success', $data['timing'] === 'immediate' ? 'Plan changed.' : 'Plan change scheduled for the end of the current billing period.');
    }

    public function cancelPlan(Request $request, SubscriptionLifecycle $subscriptions, CentralAuditService $audit)
    {
        $tenant = $this->tenant($request);
        $this->authorize('managePlan', $tenant);
        $request->validate(['confirm' => ['accepted']]);
        $subscription = Subscription::where('tenant_id', $tenant->getKey())->latest('id')->firstOrFail();
        $updated = $subscriptions->cancel($subscription, false);
        $audit->log($request, 'subscription.changed_by_platform_user', $updated, ['status' => $subscription->status], ['action' => 'cancel_at_period_end'], ['tenant_id' => $tenant->getKey()]);

        return back()->with('success', 'Your subscription will end when the current period closes.');
    }

    public function resumePlan(Request $request, SubscriptionLifecycle $subscriptions, CentralAuditService $audit)
    {
        $tenant = $this->tenant($request);
        $this->authorize('managePlan', $tenant);
        $subscription = Subscription::where('tenant_id', $tenant->getKey())->latest('id')->firstOrFail();
        $updated = $subscriptions->reactivate($subscription);
        $audit->log($request, 'subscription.changed_by_platform_user', $updated, ['status' => $subscription->status], ['action' => 'resume'], ['tenant_id' => $tenant->getKey()]);

        return back()->with('success', 'Subscription resumed.');
    }

    /** Hands off to the existing signed checkout page. No duplicate flow. */
    public function payInvoice(Request $request, string $tenant, TenantInvoice $invoice, CentralAuditService $audit)
    {
        $resolved = $this->tenant($request);
        $this->authorize('makePayment', $resolved);
        abort_unless($invoice->tenant_id === $resolved->getKey(), 403);
        abort_if(in_array($invoice->status, ['paid', 'void'], true), 422, 'This invoice is not payable.');
        $audit->log($request, 'invoice.payment_started_by_platform_user', $invoice, [], ['invoice_number' => $invoice->invoice_number], ['tenant_id' => $resolved->getKey()]);

        return redirect(URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id]));
    }

    public function showInvoice(Request $request, string $tenant, TenantInvoice $invoice)
    {
        $resolved = $this->tenant($request);
        $this->authorize('viewInvoices', $resolved);
        abort_unless($invoice->tenant_id === $resolved->getKey(), 403);

        return redirect(URL::signedRoute('central.billing.invoice.show', ['invoice' => $invoice->id]));
    }

    private function tenant(Request $request): Tenant
    {
        $tenant = $request->attributes->get('platformTenant');
        abort_unless($tenant instanceof Tenant, 403);

        return $tenant;
    }
}
