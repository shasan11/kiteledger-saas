<?php

namespace App\Console\Commands;

use Database\Seeders\DemoFullSeeder;
use Database\Seeders\DemoLiteSeeder;
use Illuminate\Console\Command;
use Throwable;

class SeedDemoCommand extends Command
{
    protected $signature = 'kiteledger:seed-demo {--profile=quick : Demo profile: quick or full} {--force : Required for full demo in production}';

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

        $start = microtime(true);
        $this->info("Starting {$profile} demo seeding...");
        logger()->info('Demo seeding started.', ['profile' => $profile]);

        try {
            $this->callSilent('db:seed', [
                '--class' => $profile === 'full' ? DemoFullSeeder::class : DemoLiteSeeder::class,
                '--force' => true,
            ]);
        } catch (Throwable $e) {
            $this->error('Demo seeding failed: '.$e->getMessage());
            logger()->error('Demo seeding failed.', [
                'profile' => $profile,
                'message' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }

        logger()->info('Demo seeding finished.', [
            'profile' => $profile,
            'seconds' => round(microtime(true) - $start, 2),
        ]);
        $this->info("{$profile} demo dataset seeded.");

        return self::SUCCESS;
    }
}
