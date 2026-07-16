<?php

namespace App\Services\SaaS;

use App\Jobs\SaaS\ProvisionTenantJob;
use App\Models\Central\Tenant;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseNameGenerator;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantProvisioningService
{
    public function __construct(private TenantDomainService $domains, private TenantDatabaseNameGenerator $databaseNames) {}

    public function create(array $attributes): Tenant
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($attributes): Tenant {
            $password = $attributes['owner_password'];
            $subdomain = $this->domains->normalizeSubdomain($attributes['subdomain']);
            unset($attributes['owner_password'], $attributes['subdomain']);
            $id = (string) Str::uuid();
            $mode = (string) config('saas.database.mode', 'pool');
            $databaseName = $mode === 'pool' ? null : $this->databaseNames->generate($subdomain);

            $tenant = Tenant::query()->create($attributes + [
                'id' => $id,
                'status' => 'pending',
                'database_name' => $databaseName,
                'database_provisioning_mode' => $mode,
                'data' => ['provisioning_owner_password' => Crypt::encryptString($password)],
            ]);
            if ($databaseName) {
                $tenant->setInternal('db_name', $tenant->database_name);
            }
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
