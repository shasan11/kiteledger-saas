<?php

namespace App\Console\Commands;

use App\Models\AiEmbedding;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class AiReembedTenantCommand extends Command
{
    protected $signature = 'ai:reembed-tenant {tenant : Tenant UUID or slug}';

    protected $description = 'Delete stale vectors and regenerate embeddings for one tenant.';

    public function handle(): int
    {
        $tenant = Tenant::query()->whereKey($this->argument('tenant'))->orWhere('slug', $this->argument('tenant'))->first();
        if (! $tenant) {
            $this->error('Tenant not found.');

            return self::FAILURE;
        }

        try {
            tenancy()->initialize($tenant);
            $deleted = AiEmbedding::query()->delete();
            $this->info("Removed {$deleted} stale embedding(s).");

            return Artisan::call('ai:index-all', [], $this->output) === self::SUCCESS ? self::SUCCESS : self::FAILURE;
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } finally {
            if (tenancy()->initialized) {
                tenancy()->end();
            }
        }
    }
}
