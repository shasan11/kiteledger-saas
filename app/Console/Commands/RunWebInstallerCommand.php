<?php

namespace App\Console\Commands;

use App\Services\Installer\WebDatabaseInstaller;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * CLI install — runs the same migrate + seed the web installer does, but with
 * no HTTP timeout. Use this if the browser install is interrupted:
 *
 *   php artisan install:run-web
 */
class RunWebInstallerCommand extends Command
{
    protected $signature = 'install:run-web';

    protected $description = 'Run the database install (migrate + seed) from the command line.';

    public function handle(WebDatabaseInstaller $installer, WebInstallStatus $status): int
    {
        if (InstalledState::isInstalled()) {
            $this->warn('Already installed (storage/installed exists). Delete it to reinstall.');

            return self::SUCCESS;
        }

        $state = $status->read();

        if (($state['state'] ?? 'idle') === 'idle') {
            $status->begin();
        }

        $status->workerStarted('php artisan install:run-web');
        Log::info('Installer worker started.');

        try {
            $result = $installer->run(function (string $message, ?string $step = null) use ($status): void {
                $status->progress($message, $step);
                Log::info('Installer progress: '.$message);
                $this->line($message);
            });

            InstalledState::mark();
            $status->succeeded($result['message']);
            Log::info('Installer succeeded.');
            $this->info($result['message']);

            return self::SUCCESS;
        } catch (Throwable $e) {
            $message = $e->getMessage() ?: 'Installation failed.';
            $status->failed($message);
            Log::error('Installer failed: '.$message);
            $this->error($message);

            return self::FAILURE;
        }
    }
}
