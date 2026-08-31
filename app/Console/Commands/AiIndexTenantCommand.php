<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class AiIndexTenantCommand extends Command
{
    protected $signature = 'ai:index-tenant {tenant : Tenant UUID or slug} {--no-embeddings : Build keyword indexes only}';

    protected $description = 'Initialize one tenant and rebuild its isolated AI knowledge index.';

    public function handle(): int
    {
        $tenant = Tenant::query()
            ->whereKey($this->argument('tenant'))
            ->orWhere('slug', $this->argument('tenant'))
            ->first();

        if (! $tenant) {
            $this->error('Tenant not found.');

            return self::FAILURE;
        }

        try {
            tenancy()->initialize($tenant);
            $arguments = $this->option('no-embeddings') ? ['--no-embeddings' => true] : [];
            $exit = Artisan::call('ai:index-all', $arguments, $this->output);

            return $exit === self::SUCCESS ? self::SUCCESS : self::FAILURE;
        } catch (Throwable $exception) {
            $this->error("Tenant {$tenant->id}: {$exception->getMessage()}");

            return self::FAILURE;
        } finally {
            if (tenancy()->initialized) {
                tenancy()->end();
            }
        }
    }
}
