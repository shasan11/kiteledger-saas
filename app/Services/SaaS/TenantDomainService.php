<?php

namespace App\Services\SaaS;

use App\Models\Central\Domain;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TenantDomainService
{
    public function normalizeSubdomain(string $subdomain): string
    {
        $value = Str::lower(trim($subdomain));
        if (! preg_match('/^(?!-)[a-z0-9-]{2,63}(?<!-)$/', $value) || in_array($value, config('saas.reserved_subdomains', []), true)) {
            throw ValidationException::withMessages(['subdomain' => 'This subdomain is invalid or reserved.']);
        }

        return $value;
    }

    public function subdomainHost(string $subdomain): string
    {
        return $this->normalizeSubdomain($subdomain).'.'.config('saas.base_domain');
    }

    public function attachSubdomain(Tenant $tenant, string $subdomain, bool $primary = true): Domain
    {
        return $tenant->domains()->create([
            'domain' => $this->subdomainHost($subdomain), 'type' => 'subdomain', 'status' => 'active',
            'is_primary' => $primary, 'verified_at' => now(),
        ]);
    }

    public function attachCustomDomain(Tenant $tenant, string $host): Domain
    {
        $host = $this->normalizeCustomDomain($host);

        return $tenant->domains()->create(['domain' => $host, 'type' => 'custom', 'status' => 'pending', 'verification_token' => Str::random(48)]);
    }

    public function normalizeCustomDomain(string $host): string
    {
        $host = Str::lower(rtrim(trim($host), '.'));
        if ($host === '' || str_contains($host, '://') || str_contains($host, '/') || str_contains($host, ':') || str_contains($host, '*') || filter_var($host, FILTER_VALIDATE_IP)) {
            throw ValidationException::withMessages(['domain' => 'Enter a hostname without a scheme, path, port, wildcard, or IP address.']);
        }
        $ascii = function_exists('idn_to_ascii') ? idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) : $host;
        $central = array_map(fn ($value) => Str::lower(rtrim($value, '.')), config('tenancy.central_domains', []));
        if (! is_string($ascii) || ! filter_var('https://'.$ascii, FILTER_VALIDATE_URL) || ! str_contains($ascii, '.') || in_array($ascii, ['localhost', ...$central], true) || str_ends_with($ascii, '.'.config('saas.base_domain'))) {
            throw ValidationException::withMessages(['domain' => 'This hostname is malformed or reserved.']);
        }

        return $ascii;
    }

    public function verify(Domain $domain): bool
    {
        $token = $domain->verification_token;
        $txt = @dns_get_record('_kiteledger.'.$domain->domain, DNS_TXT) ?: [];
        $cname = @dns_get_record('_kiteledger.'.$domain->domain, DNS_CNAME) ?: [];
        $verified = collect($txt)->contains(fn ($record) => ($record['txt'] ?? '') === 'kiteledger-verification='.$token)
            || collect($cname)->contains(fn ($record) => rtrim(strtolower($record['target'] ?? ''), '.') === strtolower($token.'.verify.'.config('saas.base_domain')));
        $domain->forceFill(['verification_attempted_at' => now(), 'status' => $verified ? 'active' : 'pending', 'verified_at' => $verified ? now() : null, 'activated_at' => $verified ? now() : null])->save();

        return $verified;
    }

    public function makePrimary(Domain $domain): void
    {
        abort_unless($domain->status === 'active' && $domain->verified_at, 409, 'Only a verified active domain can be primary.');
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($domain): void {
            Domain::where('tenant_id', $domain->tenant_id)->lockForUpdate()->update(['is_primary' => false]);
            $domain->forceFill(['is_primary' => true])->save();
        });
    }
}
