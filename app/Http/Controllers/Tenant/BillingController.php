<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Central\Plan;
use App\Services\SaaS\TenantUsageService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function __invoke(Request $request, TenantUsageService $usage)
    {
        abort_unless($request->user()?->isMainBranchAdminOrAbove(), 403);
        $tenant = tenant();
        $metric = $usage->calculate($tenant);

        return Inertia::render('Tenant/Billing/Overview', ['tenant' => $tenant->load(['plan', 'subscription', 'domains', 'invoices']), 'usage' => $metric, 'plans' => Plan::where('is_active', true)->orderBy('sort_order')->get()]);
    }
}
