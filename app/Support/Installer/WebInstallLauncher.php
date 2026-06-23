<?php

namespace App\Support\Installer;

use RuntimeException;
use Symfony\Component\Process\PhpExecutableFinder;

class WebInstallLauncher
{
    public function launch(): string
    {
        if (! function_exists('popen')) {
            throw new RuntimeException('The installer worker could not be started because popen() is disabled. Run php artisan install:run-web from the command line.');
        }

        $php = (new PhpExecutableFinder)->find(false) ?: PHP_BINARY;
        $artisan = base_path('artisan');
        $log = storage_path('logs/installer-worker.log');

        if (! is_dir(dirname($log))) {
            @mkdir(dirname($log), 0775, true);
        }

        $command = $this->command($php, $artisan, $log);
        $handle = @popen($command, 'r');

        if (! is_resource($handle)) {
            throw new RuntimeException('The installer worker could not be started. Run php artisan install:run-web from the command line.');
        }

        @pclose($handle);

        return 'php artisan install:run-web';
    }

    private function command(string $php, string $artisan, string $log): string
    {
        if (DIRECTORY_SEPARATOR === '\\') {
            return 'start /B "" '
                .escapeshellarg($php).' '
                .escapeshellarg($artisan).' install:run-web >> '
                .escapeshellarg($log).' 2>&1';
        }

        return 'cd '.escapeshellarg(base_path()).' && nohup '
            .escapeshellarg($php).' '
            .escapeshellarg($artisan).' install:run-web >> '
            .escapeshellarg($log).' 2>&1 &';
    }
}
