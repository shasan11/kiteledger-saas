<?php

namespace App\Services\Tenancy;

use App\Models\Central\Tenant;
use App\Services\SaaS\TenantProvisioningRunner;
use App\Services\SaaS\TenantProvisioningService as CentralTenantProvisioningService;
use Illuminate\Support\Facades\Crypt;

/**
 * Backwards-compatible adapter for legacy callers.
 *
 * The provisioning pipeline lives exclusively in TenantProvisioningRunner.
 */
class TenantProvisioningService
{
    public function __construct(
        private CentralTenantProvisioningService $provisioning,
        private TenantProvisioningRunner $runner,
    ) {}

    public function provision(array $input): Tenant
    {
        return $this->provisioning->create([
            'company_name' => $input['company_name'],
            'slug' => $input['slug'] ?? $input['subdomain'],
            'owner_name' => $input['owner_name'],
            'owner_email' => $input['owner_email'],
            'owner_password' => $input['owner_password'],
            'plan_id' => $input['plan_id'] ?? null,
            'default_template_id' => $input['default_template_id'] ?? null,
            'provisioning_mode' => $input['provisioning_mode'] ?? null,
            'subdomain' => $input['subdomain'] ?? $input['slug'],
            'timezone' => $input['timezone'] ?? 'UTC',
            'currency' => $input['currency'] ?? 'USD',
            'tenancy_db_host' => $input['tenancy_db_host'] ?? $input['db_host'] ?? null,
            'tenancy_db_port' => $input['tenancy_db_port'] ?? $input['db_port'] ?? null,
            'tenancy_db_name' => $input['tenancy_db_name'] ?? $input['db_database'] ?? null,
            'tenancy_db_username' => $input['tenancy_db_username'] ?? $input['db_username'] ?? null,
            'tenancy_db_password' => $input['tenancy_db_password'] ?? $input['db_password'] ?? null,
        ]);
    }

    public function retry(Tenant|string $tenant, ?string $ownerPassword = null): Tenant
    {
        $tenant = is_string($tenant) ? Tenant::query()->findOrFail($tenant) : $tenant;
        if ($ownerPassword !== null) {
            $tenant->forceFill([
                'provisioning_owner_password' => Crypt::encryptString($ownerPassword),
            ])->save();
        }

        return $this->runner->run($tenant, true);
    }
}
