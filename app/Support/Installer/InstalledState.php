<?php

namespace App\Support\Installer;

use RuntimeException;

class InstalledState
{
    public static function lockPath(): string
    {
        return storage_path('app/installed');
    }

    /**
     * Installed === the lock file exists. Nothing else.
     *
     * We deliberately do NOT infer "installed" from the database having users:
     * the installer runs migrate:fresh + seed BEFORE it writes the lock, so a
     * run that fails partway leaves users in the DB with no lock. Treating that
     * as "installed" would permanently block /install with "already installed"
     * and make the failure unrecoverable from the browser. The lock is written
     * only after a fully successful install, so its presence is the one true
     * signal. To re-run the installer, delete storage/app/installed.
     */
    public static function isInstalled(): bool
    {
        return is_file(self::lockPath());
    }

    public static function mark(): void
    {
        $path = self::lockPath();
        $directory = dirname($path);

        if (! is_dir($directory) && ! @mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException("Could not create install lock directory: {$directory}");
        }

        if (! is_writable($directory)) {
            throw new RuntimeException("Install lock directory is not writable: {$directory}");
        }

        $contents = 'installed_at='.date('c').PHP_EOL;
        $bytes = @file_put_contents($path, $contents, LOCK_EX);

        if ($bytes === false || $bytes < strlen($contents)) {
            $error = error_get_last()['message'] ?? 'unknown write error';

            throw new RuntimeException("Could not write install lock at {$path}: {$error}");
        }
    }

    public static function clear(): void
    {
        if (is_file(self::lockPath())) {
            @unlink(self::lockPath());
        }
    }
}
