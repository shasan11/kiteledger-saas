<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Services\SaaS\TenantAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * The active tenant is a server-verified session value. A tenant id posted by
 * the browser is only honoured when the signed-in user holds a live membership.
 */
class TenantContextController extends Controller
{
    public function index(Request $request, TenantAccessService $access)
    {
        return Inertia::render('Platform/Tenants/Index', ['tenants' => $access->tenantCards($request->user('platform'))]);
    }

    public function switch(Request $request, TenantAccessService $access)
    {
        $data = $request->validate(['tenant_id' => ['required', 'string']]);
        $tenant = $access->resolveAccessibleTenant($request->user('platform'), $data['tenant_id']);
        abort_unless($tenant !== null, 403, 'You do not have access to this company.');
        $request->session()->put('platform_active_tenant_id', $tenant->getKey());

        return redirect()->route('central.account.tenants.show', ['tenant' => $tenant->getKey()]);
    }
}
