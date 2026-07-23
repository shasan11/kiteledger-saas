<?php

namespace App\Services\SaaS;

use App\Jobs\SaaS\ProvisionTenantJob;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TenantProvisioningService
{
    public function __construct(private TenantDomainService $domains) {}

    public function create(array $attributes): Tenant
    {
        Validator::make($attributes, [
            'tenancy_db_host' => ['required', 'string'],
            'tenancy_db_port' => ['required', 'integer', 'between:1,65535'],
            'tenancy_db_name' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'tenancy_db_username' => ['required', 'string'],
            'tenancy_db_password' => ['present', 'nullable', 'string'],
        ])->validate();

        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($attributes): Tenant {
            $password = $attributes['owner_password'];
            $subdomain = $this->domains->normalizeSubdomain($attributes['subdomain']);
            unset($attributes['owner_password'], $attributes['subdomain']);
            $id = (string) Str::uuid();
            $mode = 'manual';
            $databaseName = (string) $attributes['tenancy_db_name'];

            $tenant = Tenant::query()->create($attributes + [
                'id' => $id,
                'status' => 'pending',
                'database_name' => $databaseName,
                'database_provisioning_mode' => $mode,
                'tenancy_db_connection' => 'tenant_template',
                'database_created_by_app' => false,
                'data' => ['provisioning_owner_password' => Crypt::encryptString($password)],
            ]);
            $tenant->setInternal('db_connection', 'tenant_template');
            $tenant->setInternal('db_name', $tenant->tenancy_db_name);
            $tenant->setInternal('db_host', $tenant->tenancy_db_host);
            $tenant->setInternal('db_port', $tenant->tenancy_db_port);
            $tenant->setInternal('db_username', $tenant->tenancy_db_username);
            $tenant->setInternal('db_password', $tenant->tenancy_db_password);
            $tenant->save();
            $this->domains->attachSubdomain($tenant, $subdomain);

            DB::afterCommit(function () use ($tenant): void {
                $job = new ProvisionTenantJob($tenant->getTenantKey());
                config('saas.provision_sync') ? dispatch_sync($job) : dispatch($job->onConnection('central')->onQueue(config('saas.provisioning_queue')));
            });

            return $tenant;
        });
    }

    public function retry(Tenant $tenant): void
    {
        $job = new ProvisionTenantJob($tenant->getTenantKey(), true);
        config('saas.provision_sync') ? dispatch_sync($job) : dispatch($job->onConnection('central')->onQueue(config('saas.provisioning_queue')));
    }
}
