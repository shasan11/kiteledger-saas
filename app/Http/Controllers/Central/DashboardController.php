<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Subscription;
use App\Models\Central\SupportTicket;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $activeSubscriptions = Subscription::with('plan')->where('status', 'active')->get();
        $monthly = $activeSubscriptions->sum(fn ($subscription) => $subscription->billing_cycle === 'yearly'
            ? (float) ($subscription->plan?->price_yearly ?? 0) / 12
            : (float) ($subscription->plan?->price_monthly ?? 0));
        $payments = PaymentTransaction::where('status', 'success')->where('paid_at', '>=', now()->subMonths(11)->startOfMonth())->get(['amount', 'paid_at']);
        $revenueTrend = collect(range(11, 0))->map(function (int $monthsAgo) use ($payments): array {
            $month = now()->subMonths($monthsAgo);

            return [
                'month' => $month->format('M'),
                'revenue' => round($payments->filter(fn ($payment) => $payment->paid_at?->isSameMonth($month))->sum('amount'), 2),
            ];
        });
        $currentSignups = Tenant::whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count();
        $previousSignups = Tenant::whereBetween('created_at', [now()->subMonthNoOverflow()->startOfMonth(), now()->subMonthNoOverflow()->endOfMonth()])->count();
        $signupGrowth = $previousSignups > 0 ? round((($currentSignups - $previousSignups) / $previousSignups) * 100, 1) : ($currentSignups > 0 ? 100 : 0);
        $failedProvisioning = Tenant::where('status', 'provisioning_failed')->count();
        $overdueInvoices = TenantInvoice::whereNotIn('status', ['paid', 'void'])->whereDate('due_date', '<', today())->count();
        $failedPayments = PaymentTransaction::where('status', 'failed')->count();

        $activity = Schema::hasTable('central_audit_logs')
            ? DB::table('central_audit_logs')->latest('created_at')->limit(8)->get(['id', 'action', 'model_type', 'model_id', 'created_at'])
            : collect();

        return Inertia::render('Central/Dashboard', [
            'metrics' => [
                'totalTenants' => Tenant::count(),
                'activeTenants' => Tenant::where('status', 'active')->count(),
                'trialTenants' => Tenant::where('status', 'trialing')->count(),
                'suspendedTenants' => Tenant::where('status', 'suspended')->count(),
                'expiredTenants' => Tenant::where('status', 'expired')->count(),
                'mrr' => round($monthly, 2),
                'arr' => round($monthly * 12, 2),
                'totalRevenue' => (float) PaymentTransaction::where('status', 'success')->sum('amount'),
                'pendingPayments' => (float) TenantInvoice::whereIn('status', ['issued', 'partially_paid'])->sum('total'),
                'outstandingInvoices' => TenantInvoice::whereNotIn('status', ['paid', 'void'])->count(),
                'outstandingBalance' => (float) TenantInvoice::whereNotIn('status', ['paid', 'void'])->sum('balance'),
                'failedPayments' => $failedPayments,
                'newSignups' => $currentSignups,
                'signupGrowth' => $signupGrowth,
                'openSupportTickets' => SupportTicket::whereNotIn('status', ['resolved', 'closed'])->count(),
                'slaBreachedTickets' => SupportTicket::whereNotNull('sla_breached_at')->whereNotIn('status', ['resolved', 'closed'])->count(),
            ],
            'recentTenants' => Tenant::with(['plan', 'domains'])->latest()->limit(8)->get(),
            'planDistribution' => Tenant::selectRaw('plan_id, count(*) total')->with('plan')->groupBy('plan_id')->get(),
            'revenueTrend' => $revenueTrend,
            'recentPayments' => PaymentTransaction::with(['invoice:id,invoice_number', 'tenant:id,company_name'])->latest('paid_at')->limit(8)->get(),
            'urgentTickets' => SupportTicket::with('tenant:id,company_name')->where('priority', 'urgent')->whereNotIn('status', ['resolved', 'closed'])->latest('updated_at')->limit(8)->get(),
            'provisioningFunnel' => collect(['pending', 'provisioning', 'active', 'provisioning_failed'])->map(fn ($status) => ['status' => $status, 'count' => Tenant::where('status', $status)->count()]),
            'attention' => [
                ['key' => 'provisioning', 'label' => 'Provisioning failures', 'count' => $failedProvisioning, 'route' => route('central.tenants.index', ['status' => 'provisioning_failed'])],
                ['key' => 'invoices', 'label' => 'Overdue invoices', 'count' => $overdueInvoices, 'route' => route('central.invoices.index', ['status' => 'issued'])],
                ['key' => 'payments', 'label' => 'Failed payments', 'count' => $failedPayments, 'route' => route('central.payments.index', ['status' => 'failed'])],
                ['key' => 'suspended', 'label' => 'Suspended tenants', 'count' => Tenant::where('status', 'suspended')->count(), 'route' => route('central.tenants.index', ['status' => 'suspended'])],
                ['key' => 'support', 'label' => 'SLA-breached support tickets', 'count' => SupportTicket::whereNotNull('sla_breached_at')->whereNotIn('status', ['resolved', 'closed'])->count(), 'route' => route('central.support.tickets.index', ['view' => 'sla_breached'])],
            ],
            'health' => [
                ['name' => 'Central database', 'status' => DB::connection()->getPdo() ? 'healthy' : 'warning', 'detail' => 'Connected'],
                ['name' => 'Provisioning pipeline', 'status' => $failedProvisioning ? 'warning' : 'healthy', 'detail' => $failedProvisioning ? "$failedProvisioning need attention" : 'No failures'],
                ['name' => 'Billing pipeline', 'status' => $failedPayments ? 'warning' : 'healthy', 'detail' => $failedPayments ? "$failedPayments failed" : 'Processing normally'],
                ['name' => 'Queue workload', 'status' => 'healthy', 'detail' => ProvisioningLog::where('status', 'running')->count().' running'],
            ],
            'activity' => $activity,
        ]);
    }
}
