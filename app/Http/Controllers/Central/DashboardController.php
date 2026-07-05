<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $monthly = Subscription::with('plan')->where('status', 'active')->get()->sum(fn ($s) => $s->billing_cycle === 'yearly' ? (float) $s->plan->price_yearly / 12 : (float) $s->plan->price_monthly);

        return Inertia::render('Central/Dashboard', [
            'metrics' => ['totalTenants' => Tenant::count(), 'activeTenants' => Tenant::where('status', 'active')->count(), 'trialTenants' => Tenant::where('status', 'trialing')->count(), 'suspendedTenants' => Tenant::where('status', 'suspended')->count(), 'expiredTenants' => Tenant::where('status', 'expired')->count(), 'mrr' => round($monthly, 2), 'arr' => round($monthly * 12, 2), 'totalRevenue' => (float) PaymentTransaction::where('status', 'success')->sum('amount'), 'pendingPayments' => TenantInvoice::whereIn('status', ['issued', 'partially_paid'])->sum('total'), 'failedPayments' => PaymentTransaction::where('status', 'failed')->count(), 'newSignups' => Tenant::where('created_at', '>=', now()->startOfMonth())->count()],
            'recentTenants' => Tenant::with(['plan', 'domains'])->latest()->limit(8)->get(),
            'failedPayments' => PaymentTransaction::where('status', 'failed')->latest()->limit(8)->get(),
            'planDistribution' => Tenant::selectRaw('plan_id, count(*) total')->with('plan')->groupBy('plan_id')->get(),
        ]);
    }
}
