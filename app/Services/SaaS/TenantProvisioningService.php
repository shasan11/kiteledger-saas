<?php

namespace App\Services\SaaS;

use App\Models\Central\Tenant;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantProvisioningService
{
    public function __construct(
        private TenantDomainService $domains,
        private TenantProvisioningRunner $runner,
    ) {}

    public function create(array $attributes): Tenant
    {
        $mode = (string) ($attributes['provisioning_mode'] ?? config('saas.database.mode', config('saas.db_provisioning_mode', 'manual')));
        $manual = $mode === 'manual';
        $mysql = $mode === 'mysql';

        Validator::make($attributes, [
            'provisioning_mode' => ['nullable', Rule::in(['manual', 'mysql', 'cpanel', 'pool', 'automatic', 'cpanel_uapi'])],
            'tenancy_db_host' => [$manual ? 'required' : 'nullable', 'string'],
            'tenancy_db_port' => [$manual ? 'required' : 'nullable', 'integer', 'between:1,65535'],
            'tenancy_db_name' => [$manual || $mysql ? 'required' : 'nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'tenancy_db_username' => [$manual ? 'required' : 'nullable', 'string'],
            'tenancy_db_password' => [$manual ? 'present' : 'nullable', 'string'],
        ])->validate();

        $attributes += [
            'tenancy_db_host' => null,
            'tenancy_db_port' => null,
            'tenancy_db_name' => null,
            'tenancy_db_username' => null,
            'tenancy_db_password' => null,
        ];

        $tenant = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($attributes, $mode): Tenant {
            $password = $attributes['owner_password'];
            $subdomain = $this->domains->normalizeSubdomain($attributes['subdomain']);
            unset($attributes['owner_password'], $attributes['subdomain'], $attributes['provisioning_mode']);
            $id = (string) Str::uuid();
            $databaseName = filled($attributes['tenancy_db_name']) ? (string) $attributes['tenancy_db_name'] : null;

            $tenant = Tenant::query()->create(array_merge($attributes, [
                'id' => $id,
                'slug' => $subdomain,
                'status' => 'pending',
                'database_name' => $databaseName,
                'database_provisioning_mode' => $mode,
                'tenancy_db_connection' => 'tenant_template',
                'database_created_by_app' => false,
                // Stancl persists non-custom attributes in the virtual `data`
                // column and exposes them as model attributes after retrieval.
                'provisioning_owner_password' => Crypt::encryptString($password),
            ]));
            $this->domains->attachSubdomain($tenant, $subdomain);

            return $tenant;
        });

        $tenant = $this->runner->run($tenant);
        if ($tenant->status !== 'active') {
            throw new \RuntimeException('tenant_provisioning_incomplete');
        }

        return $tenant;
    }

    public function retry(Tenant $tenant, ?string $ownerPassword = null): Tenant
    {
        if ($ownerPassword !== null) {
            $tenant->forceFill([
                'provisioning_owner_password' => Crypt::encryptString($ownerPassword),
            ])->save();
        }

        return $this->runner->run($tenant, true);
    }
}
