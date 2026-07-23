<?php

namespace App\Console\Commands;

use App\Models\Central\Tenant;
use App\Services\Tenancy\TenantProvisioningService;
use Illuminate\Console\Command;

class TenantRetryCommand extends Command
{
    protected $signature = 'tenant:retry {tenant} {--password=}';
    protected $description = 'Retry a failed tenant provisioning workflow';

    public function handle(TenantProvisioningService $provisioning): int
    {
        $tenant = Tenant::query()->findOrFail($this->argument('tenant'));
        $password = $this->option('password') ?: $this->secret('Tenant owner password');
        $provisioning->retry($tenant, (string) $password);
        $this->info('Tenant provisioning completed.');

        return self::SUCCESS;
    }
}
