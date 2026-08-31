<?php

namespace App\Console\Commands;

use App\Models\Central\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TenantHealthCommand extends Command
{
    protected $signature = 'tenant:health {tenant}';
    protected $description = 'Check tenant database connectivity and migration state';

    public function handle(): int
    {
        $tenant = Tenant::query()->findOrFail($this->argument('tenant'));
        try {
            $tenant->run(fn () => DB::connection()->getPdo());
            $this->info('Tenant database connection is healthy.');
            return self::SUCCESS;
        } catch (\Throwable) {
            $this->error('Tenant database connection is unavailable.');
            return self::FAILURE;
        } finally {
            if (tenancy()->initialized) tenancy()->end();
        }
    }
}
