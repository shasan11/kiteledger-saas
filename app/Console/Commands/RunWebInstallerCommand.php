<?php

namespace App\Console\Commands;

use App\Services\Installer\WebDatabaseInstaller;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallStatus;
use Illuminate\Console\Command;
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

        $status->begin($installer->steps());

        try {
            $result = $installer->run(function (string $message, ?string $step = null) use ($status): void {
                $status->progress($message, $step);
                $this->line($message);
            });

            InstalledState::mark();
            $status->succeeded($result['message']);
            $this->info($result['message']);

            return self::SUCCESS;
        } catch (Throwable $e) {
            $message = $e->getMessage() ?: 'Installation failed.';
            $status->failed($message);
            $this->error($message);

            return self::FAILURE;
        }
    }
}
