<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Services\SaaS\TenantAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request, TenantAccessService $access)
    {
        $user = $request->user('platform');
        $tenants = $access->tenantCards($user);

        return Inertia::render('Platform/Dashboard', [
            'tenants' => $tenants,
            'summary' => [
                'companies' => count($tenants),
                'owned' => count(array_filter($tenants, fn (array $tenant): bool => $tenant['role'] === 'owner')),
                'billing' => count(array_filter($tenants, fn (array $tenant): bool => $tenant['can_manage_billing'])),
            ],
        ]);
    }
}
