<?php

namespace App\Services\SaaS;

use App\Jobs\SaaS\ProvisionTenantJob;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantProvisioningService
{
    public function __construct(private TenantDomainService $domains) {}

    public function create(array $attributes): Tenant
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($attributes): Tenant {
            $password = $attributes['owner_password'];
            $subdomain = $this->domains->normalizeSubdomain($attributes['subdomain']);
            unset($attributes['owner_password'], $attributes['subdomain']);
            $id = (string) Str::uuid();

            $tenant = Tenant::query()->create($attributes + [
                'id' => $id,
                'status' => 'pending',
                'database_name' => config('tenancy.database.prefix').str_replace('-', '', $id).config('tenancy.database.suffix'),
                'data' => ['provisioning_owner_password' => Crypt::encryptString($password)],
            ]);
            $tenant->setInternal('db_name', $tenant->database_name);
            $tenant->save();
            $this->domains->attachSubdomain($tenant, $subdomain);

            DB::afterCommit(function () use ($tenant): void {
                $job = new ProvisionTenantJob($tenant->getTenantKey());
                config('saas.provision_sync') ? dispatch_sync($job) : dispatch($job->onQueue(config('saas.provisioning_queue')));
            });

            return $tenant;
        });
    }

    public function retry(Tenant $tenant): void
    {
        $job = new ProvisionTenantJob($tenant->getTenantKey(), true);
        config('saas.provision_sync') ? dispatch_sync($job) : dispatch($job->onQueue(config('saas.provisioning_queue')));
    }
}
