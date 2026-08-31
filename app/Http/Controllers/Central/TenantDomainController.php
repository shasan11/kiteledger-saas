<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Domain;
use App\Models\Central\Tenant;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\TenantDomainService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TenantDomainController extends Controller
{
    public function store(Request $request, Tenant $tenant, TenantDomainService $domains, CentralAuditService $audit)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['subdomain', 'custom'])],
            'value' => ['required', 'string', 'max:255'],
            'is_primary' => ['boolean'],
        ]);

        $host = $data['type'] === 'subdomain'
            ? $domains->subdomainHost($data['value'])
            : $domains->normalizeCustomDomain($data['value']);

        abort_if(
            Domain::query()->where('domain', $host)->where('tenant_id', '!=', $tenant->id)->exists(),
            422,
            'That domain is already assigned to another customer.'
        );

        // The first domain has to be primary, otherwise the workspace is unreachable.
        $primary = (bool) ($data['is_primary'] ?? false) || ! $tenant->domains()->exists();

        $domain = $data['type'] === 'subdomain'
            ? $domains->attachSubdomain($tenant, $data['value'], $primary)
            : $domains->attachCustomDomain($tenant, $host);

        if ($primary && $domain->is_primary) {
            Domain::query()->where('tenant_id', $tenant->id)->whereKeyNot($domain->id)->update(['is_primary' => false]);
        }

        $audit->log($request, 'tenant.domain.added', $tenant, [], $domain->only(['domain', 'type', 'status', 'is_primary']));

        return back()->with('success', $domain->type === 'custom'
            ? 'Domain added. Publish the verification record, then verify it.'
            : 'Domain added.');
    }

    public function verify(Request $request, Tenant $tenant, Domain $domain, TenantDomainService $domains, CentralAuditService $audit)
    {
        $this->assertOwnedBy($tenant, $domain);
        $old = $domain->only(['status', 'verification_status', 'verified_at']);
        $verified = $domains->verify($domain);
        $audit->log($request, 'tenant.domain.verified', $tenant, $old, $domain->fresh()->only(['status', 'verification_status', 'verified_at']));

        return back()->with($verified ? 'success' : 'error', $verified
            ? 'Domain verified.'
            : 'The verification record could not be found in DNS yet.');
    }

    public function primary(Request $request, Tenant $tenant, Domain $domain, TenantDomainService $domains, CentralAuditService $audit)
    {
        $this->assertOwnedBy($tenant, $domain);
        $domains->makePrimary($domain);
        $audit->log($request, 'tenant.domain.primary', $tenant, [], $domain->only(['domain', 'is_primary']));

        return back()->with('success', 'Primary domain updated.');
    }

    public function destroy(Request $request, Tenant $tenant, Domain $domain, CentralAuditService $audit)
    {
        $this->assertOwnedBy($tenant, $domain);
        abort_if($tenant->domains()->count() <= 1, 422, 'A customer must keep at least one domain.');
        abort_if((bool) $domain->is_primary, 422, 'Promote another domain to primary before removing this one.');

        $removed = $domain->only(['domain', 'type', 'status']);
        $domain->delete();
        $audit->log($request, 'tenant.domain.removed', $tenant, $removed, []);

        return back()->with('success', 'Domain removed.');
    }

    private function assertOwnedBy(Tenant $tenant, Domain $domain): void
    {
        abort_unless((string) $domain->tenant_id === (string) $tenant->id, 404);
    }
}
