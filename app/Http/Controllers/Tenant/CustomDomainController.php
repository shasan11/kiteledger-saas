<?php

namespace App\Http\Controllers\Tenant;

use App\Contracts\SaaS\FeatureResolver;
use App\Contracts\SaaS\QuotaManager;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\StoreCustomDomainRequest;
use App\Models\Central\Domain;
use App\Services\SaaS\TenantDomainService;
use Illuminate\Http\Request;

class CustomDomainController extends Controller
{
    public function index()
    {
        return response()->json(['data' => tenant()->domains()->orderByDesc('is_primary')->get()]);
    }

    public function store(StoreCustomDomainRequest $request, TenantDomainService $domains, FeatureResolver $features, QuotaManager $quotas)
    {
        abort_unless($features->allows(tenant(), 'custom_domains'), 403, 'Your plan does not include custom domains.');
        $reservation = $quotas->reserve(tenant(), 'custom_domains');
        try {
            $domain = $domains->attachCustomDomain(tenant(), $request->validated('domain'));
            if ($reservation) {
                $quotas->finalize($reservation);
            }

            return response()->json(['data' => $domain, 'dns' => ['name' => '_kiteledger.'.$domain->domain, 'txt_value' => 'kiteledger-verification='.$domain->verification_token]], 201);
        } catch (\Throwable $e) {
            if ($reservation) {
                $quotas->release($reservation);
            } throw $e;
        }
    }

    public function verify(Domain $domain, TenantDomainService $domains)
    {
        $this->owned($domain);

        return response()->json(['verified' => $domains->verify($domain), 'data' => $domain->fresh()]);
    }

    public function primary(Domain $domain, TenantDomainService $domains)
    {
        $this->owned($domain);
        $domains->makePrimary($domain);

        return response()->json(['data' => $domain->fresh()]);
    }

    public function destroy(Request $request, Domain $domain)
    {
        $this->owned($domain);
        abort_if($domain->is_primary, 409, 'Switch the primary domain before removing it.');
        $domain->delete();

        return response()->noContent();
    }

    private function owned(Domain $domain): void
    {
        abort_unless($domain->tenant_id === tenant()->id, 404);
    }
}
