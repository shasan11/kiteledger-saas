<?php

namespace App\Support\Installer;

use RuntimeException;
use Symfony\Component\Process\PhpExecutableFinder;

class WebInstallLauncher
{
    public function launch(string $token): void
    {
        $php = (new PhpExecutableFinder)->find(false) ?: PHP_BINARY;
        $artisan = base_path('artisan');
        $log = storage_path('logs/installer-worker.log');

        if (! is_dir(dirname($log))) {
            @mkdir(dirname($log), 0775, true);
        }

        $command = $this->command($php, $artisan, $token, $log);
        $handle = @popen($command, 'r');

        if (! is_resource($handle)) {
            throw new RuntimeException('Could not start the installer worker. Run php artisan install:run-web from the command line.');
        }

        @pclose($handle);
    }

    private function command(string $php, string $artisan, string $token, string $log): string
    {
        if (DIRECTORY_SEPARATOR === '\\') {
            return 'start /B "" '
                .escapeshellarg($php).' '
                .escapeshellarg($artisan).' install:run-web --token='.escapeshellarg($token).' >> '
                .escapeshellarg($log).' 2>&1';
        }

        return 'cd '.escapeshellarg(base_path()).' && nohup '
            .escapeshellarg($php).' '
            .escapeshellarg($artisan).' install:run-web --token='.escapeshellarg($token).' >> '
            .escapeshellarg($log).' 2>&1 &';
    }
}
