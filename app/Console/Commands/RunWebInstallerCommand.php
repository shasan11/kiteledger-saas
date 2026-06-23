<?php

namespace App\Console\Commands;

use App\Services\Installer\WebDatabaseInstaller;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallStatus;
use Illuminate\Console\Command;
use Throwable;

class RunWebInstallerCommand extends Command
{
    protected $signature = 'install:run-web {--token= : Worker token from the installer status file}';

    protected $description = 'Run the web installer database step outside the HTTP request.';

    public function handle(WebDatabaseInstaller $installer, WebInstallStatus $status): int
    {
        $token = (string) $this->option('token');

        if ($token === '' || ! $status->tokenMatches($token)) {
            $this->error('Installer token is missing, stale, or already finished.');

            return self::FAILURE;
        }

        try {
            $result = $installer->run(function (string $message, ?string $step = null) use ($status): void {
                $status->progress($message, $step);
                $this->line($message);
            });

            $status->progress('Writing the installation lock.', 'Finalizing');
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
