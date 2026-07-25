<?php

namespace App\Console\Commands;

use App\Services\Tenancy\TenantProvisioningService;
use Illuminate\Console\Command;

class TenantCreateCommand extends Command
{
    protected $signature = 'tenant:create {company} {slug} {email} {--owner=} {--password=} {--plan=} {--mode=manual} {--db-host=} {--db-port=3306} {--db-database=} {--db-username=} {--db-password=}';

    protected $description = 'Create and immediately provision an isolated tenant database';

    public function handle(TenantProvisioningService $provisioning): int
    {
        $password = $this->option('password') ?: $this->secret('Tenant owner password');
        $tenant = $provisioning->provision([
            'company_name' => $this->argument('company'), 'slug' => $this->argument('slug'),
            'owner_name' => $this->option('owner') ?: 'Tenant Owner', 'owner_email' => $this->argument('email'),
            'owner_password' => $password, 'plan_id' => $this->option('plan'), 'provisioning_mode' => $this->option('mode'),
            'db_host' => $this->option('db-host'), 'db_port' => $this->option('db-port'),
            'db_database' => $this->option('db-database'), 'db_username' => $this->option('db-username'),
            'db_password' => $this->option('db-password'),
        ]);
        $this->info("Tenant {$tenant->id} was created and provisioned.");

        return self::SUCCESS;
    }
}
