<?php

namespace App\Support\Installer;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InstalledState
{
    public static function lockPath(): string
    {
        return storage_path('app/installed');
    }

    /**
     * The system is considered installed when the lock file exists, OR when an
     * app key is configured and the database already has users (an existing
     * deployment that pre-dates the installer). In the latter case we self-heal
     * by writing the lock file so subsequent checks are cheap.
     */
    public static function isInstalled(): bool
    {
        if (is_file(self::lockPath())) {
            return true;
        }

        try {
            if (config('app.key') && Schema::hasTable('users') && DB::table('users')->exists()) {
                self::mark();
                return true;
            }
        } catch (\Throwable) {
            // Database not reachable / not migrated yet → not installed.
        }

        return false;
    }

    public static function mark(): void
    {
        @file_put_contents(self::lockPath(), 'installed_at=' . date('c') . PHP_EOL);
    }

    public static function clear(): void
    {
        if (is_file(self::lockPath())) {
            @unlink(self::lockPath());
        }
    }
}
