<?php

namespace App\Console\Commands;

use App\Jobs\AI\RebuildTenantAiKnowledge;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class AiIndexTenantsCommand extends Command
{
    protected $signature = 'ai:index-tenants {--no-embeddings : Build keyword indexes only} {--queue : Queue one isolated rebuild per tenant}';

    protected $description = 'Rebuild isolated AI indexes for all operational tenants.';

    public function handle(): int
    {
        $failures = 0;
        $processed = 0;

        foreach (Tenant::query()->orderBy('id')->cursor() as $tenant) {
            try {
                tenancy()->initialize($tenant);
                if ($this->option('queue')) {
                    RebuildTenantAiKnowledge::dispatch(! $this->option('no-embeddings'));
                    $this->line("Queued tenant {$tenant->id}.");
                } else {
                    $arguments = $this->option('no-embeddings') ? ['--no-embeddings' => true] : [];
                    $exit = Artisan::call('ai:index-all', $arguments, $this->output);
                    if ($exit !== self::SUCCESS) {
                        $failures++;
                    }
                }
                $processed++;
            } catch (Throwable $exception) {
                $failures++;
                $this->error("Tenant {$tenant->id}: {$exception->getMessage()}");
            } finally {
                if (tenancy()->initialized) {
                    tenancy()->end();
                }
            }
        }

        $this->info("Processed {$processed} tenant(s); {$failures} failed.");

        return $failures === 0 ? self::SUCCESS : self::FAILURE;
    }
}
