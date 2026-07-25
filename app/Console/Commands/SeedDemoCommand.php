<?php

namespace App\Console\Commands;

use App\Models\Central\Tenant;
use Database\Seeders\DemoFullSeeder;
use Database\Seeders\DemoLiteSeeder;
use Illuminate\Console\Command;
use Illuminate\Database\Seeder;
use Throwable;

class SeedDemoCommand extends Command
{
    protected $signature = 'kiteledger:seed-demo
        {--tenant= : Seed one tenant by its exact tenant ID}
        {--profile=quick : Demo profile: quick or full}
        {--force : Required for full demo in production}';

    protected $description = 'Seed KiteLedger demo data using the quick or full profile.';

    public function handle(): int
    {
        $profile = strtolower((string) $this->option('profile'));
        if (! in_array($profile, ['quick', 'full'], true)) {
            $this->error('Invalid profile. Use --profile=quick or --profile=full.');

            return self::FAILURE;
        }

        if ($profile === 'full' && app()->environment('production') && ! $this->option('force')) {
            $this->error('Full demo seeding in production requires --force.');

            return self::FAILURE;
        }

        $tenantId = trim((string) $this->option('tenant'));
        $tenant = $tenantId !== '' ? Tenant::query()->find($tenantId) : null;
        if ($tenantId !== '' && ! $tenant) {
            $this->error("Tenant [{$tenantId}] was not found. Nothing was seeded.");

            return self::FAILURE;
        }

        $start = microtime(true);
        $target = $tenant ? "tenant {$tenant->id}" : 'the current database';
        $this->info("Starting {$profile} demo seeding for {$target}...");
        logger()->info('Demo seeding started.', ['profile' => $profile, 'tenant_id' => $tenant?->id]);

        try {
            $seeder = $profile === 'full' ? DemoFullSeeder::class : DemoLiteSeeder::class;
            if ($tenant) {
                $tenant->run(fn () => $this->runSeeder($seeder));
            } else {
                $this->callSilent('db:seed', ['--class' => $seeder, '--force' => true]);
            }
        } catch (Throwable $e) {
            $this->error('Demo seeding failed: '.$e->getMessage());
            logger()->error('Demo seeding failed.', [
                'profile' => $profile,
                'tenant_id' => $tenant?->id, 'message' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }

        logger()->info('Demo seeding finished.', [
            'profile' => $profile, 'tenant_id' => $tenant?->id,
            'seconds' => round(microtime(true) - $start, 2),
        ]);
        $this->info("{$profile} demo dataset seeded for {$target}.");

        return self::SUCCESS;
    }

    private function runSeeder(string $class): void
    {
        /** @var Seeder $seeder */
        $seeder = app($class);
        $seeder->setContainer(app())->setCommand($this);
        $seeder->__invoke();
    }
}
