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
     * The Froiden installer's lock file. Its canInstall middleware 404s /install
     * (the welcome/requirements/permissions screens) when this exists. We keep
     * it in sync with our own lock so a finished install blocks both the Froiden
     * intro screens and our /install/setup engine.
     */
    public static function froidenLockPath(): string
    {
        return storage_path('installed');
    }

    public static function recoveryMarkerPath(): string
    {
        return storage_path('app/install/recovery-required');
    }

    public static function hasInstallLock(): bool
    {
        return is_file(self::lockPath()) || is_file(self::froidenLockPath());
    }

    public static function requiresRecovery(): bool
    {
        $values = self::environmentValues();

        return is_file(self::recoveryMarkerPath())
            || filter_var($values['INSTALL_RECOVERY_REQUIRED'] ?? false, FILTER_VALIDATE_BOOL);
    }

    public static function hasValidAppKey(): bool
    {
        if (app()->environment('testing')) {
            return filled((string) config('app.key'));
        }

        $values = self::environmentValues();

        return filled($values['APP_KEY'] ?? null) && filled((string) config('app.key'));
    }

    public static function hasUsableDatabaseConfig(): bool
    {
        $connection = (string) config('database.default');
        $runtime = (array) config("database.connections.{$connection}", []);

        if (app()->environment('testing')) {
            if ($connection === 'sqlite') {
                return filled($runtime['database'] ?? null);
            }

            $database = trim((string) ($runtime['database'] ?? ''));
            $username = trim((string) ($runtime['username'] ?? ''));
            $password = (string) ($runtime['password'] ?? '');

            return $database !== ''
                && strtolower($database) !== 'laravel'
                && $username !== ''
                && ! (strtolower($username) === 'root' && $password === '');
        }

        $values = self::environmentValues();
        $database = trim((string) ($values['DB_DATABASE'] ?? ''));
        $username = trim((string) ($values['DB_USERNAME'] ?? ''));
        $password = (string) ($values['DB_PASSWORD'] ?? '');
        $runtimeDatabase = trim((string) ($runtime['database'] ?? ''));
        $runtimeUsername = trim((string) ($runtime['username'] ?? ''));
        $runtimePassword = (string) ($runtime['password'] ?? '');

        return $database !== ''
            && strtolower($database) !== 'laravel'
            && $username !== ''
            && ! (strtolower($username) === 'root' && $password === '')
            && $runtimeDatabase !== ''
            && strtolower($runtimeDatabase) !== 'laravel'
            && $runtimeUsername !== ''
            && ! (strtolower($runtimeUsername) === 'root' && $runtimePassword === '');
    }

    public static function hasRequiredRuntimeFiles(): bool
    {
        return is_file(base_path('vendor/autoload.php'))
            && is_file(public_path('build/manifest.json'))
            && is_file(base_path('.env'));
    }

    public static function isInstalled(): bool
    {
        return self::hasInstallLock()
            && ! self::requiresRecovery()
            && self::hasValidAppKey()
            && self::hasUsableDatabaseConfig()
            && self::hasRequiredRuntimeFiles();
    }

    /** @return array<int, string> */
    public static function recoveryProblems(): array
    {
        $problems = [];
        if (self::requiresRecovery()) {
            $problems[] = 'The previous lock was found with an incomplete environment and requires installer recovery.';
        }
        if (! is_file(base_path('.env'))) {
            $problems[] = '.env is missing.';
        }
        if (! self::hasValidAppKey()) {
            $problems[] = 'APP_KEY is missing or stale.';
        }
        if (! self::hasUsableDatabaseConfig()) {
            $problems[] = 'Database configuration is missing, invalid, or still using Laravel defaults.';
        }
        if (! is_file(base_path('vendor/autoload.php'))) {
            $problems[] = 'Vendor dependencies are missing.';
        }
        if (! is_file(public_path('build/manifest.json'))) {
            $problems[] = 'Frontend build assets are missing.';
        }

        return $problems;
    }

    public static function mark(): void
    {
        $contents = 'installed_at='.date('c').PHP_EOL;
        $errors = [];

        $wroteAppLock = self::writeLock(self::lockPath(), $contents, $errors);
        $wroteFroidenLock = self::writeLock(self::froidenLockPath(), $contents, $errors);

        if (! $wroteAppLock && ! $wroteFroidenLock) {
            throw new RuntimeException(
                'Could not write install lock. Make storage/app and storage writable by the PHP/web-server user. '
                .implode(' ', $errors)
            );
        }

        self::clearRecoveryRequirement();
    }

    private static function writeLock(string $path, string $contents, array &$errors): bool
    {
        $directory = dirname($path);

        if (! is_dir($directory) && ! @mkdir($directory, 0775, true) && ! is_dir($directory)) {
            $errors[] = "Could not create install lock directory: {$directory}.";

            return false;
        }

        if (! is_writable($directory)) {
            $errors[] = "Install lock directory is not writable: {$directory}.";

            return false;
        }

        $bytes = @file_put_contents($path, $contents, LOCK_EX);

        if ($bytes === false || $bytes < strlen($contents)) {
            $error = error_get_last()['message'] ?? 'unknown write error';
            $errors[] = "Could not write install lock at {$path}: {$error}.";

            return false;
        }

        return true;
    }

    public static function clear(): void
    {
        foreach ([self::lockPath(), self::froidenLockPath(), storage_path('app/install/status.json'), self::recoveryMarkerPath()] as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        self::clearRecoveryRequirement();
    }

    private static function clearRecoveryRequirement(): void
    {
        if (is_file(self::recoveryMarkerPath())) {
            @unlink(self::recoveryMarkerPath());
        }

        $path = base_path('.env');
        $contents = @file_get_contents($path);
        if ($contents === false || ! preg_match('/^INSTALL_RECOVERY_REQUIRED=/m', $contents)) {
            return;
        }

        $updated = (string) preg_replace('/^INSTALL_RECOVERY_REQUIRED=.*$/m', 'INSTALL_RECOVERY_REQUIRED=false', $contents, 1);
        @file_put_contents($path, $updated, LOCK_EX);
    }

    /** @return array<string, string> */
    private static function environmentValues(): array
    {
        $contents = @file_get_contents(base_path('.env'));
        if ($contents === false) {
            return [];
        }

        $values = [];
        foreach (preg_split('/\R/', $contents) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $values[trim($key)] = trim(trim($value), "\"'");
        }

        return $values;
    }
}
