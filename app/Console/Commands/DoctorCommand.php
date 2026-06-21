<?php

namespace App\Console\Commands;

use App\Support\Installer\InstalledState;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Deployment safety check. Reports PASS/FAIL for each thing KiteLedger needs
 * to run, so you can diagnose a broken GitHub clone or packaged ZIP quickly.
 */
class DoctorCommand extends Command
{
    protected $signature = 'kiteledger:doctor';

    protected $description = 'Check that this KiteLedger deployment has everything it needs to run.';

    private int $failures = 0;

    public function handle(): int
    {
        $this->line('KiteLedger deployment doctor');
        $this->line('============================');

        // PHP version
        $this->check(
            version_compare(PHP_VERSION, '8.3.0', '>='),
            'PHP '.PHP_VERSION.' (>= 8.3 required)',
            'PHP '.PHP_VERSION.' is too old. KiteLedger requires PHP 8.3+.'
        );

        // Composer dependencies
        $this->check(
            is_file(base_path('vendor/autoload.php')),
            'vendor/autoload.php exists',
            'vendor/autoload.php missing. Run: composer install --no-dev --optimize-autoloader'
        );

        // .env
        $envExists = is_file(base_path('.env'));
        $this->check(
            $envExists,
            '.env exists',
            '.env missing. Copy .env.example to .env (cp .env.example .env).'
        );

        // APP_KEY
        $appKey = (string) config('app.key');
        $this->check(
            $envExists && $appKey !== '',
            'APP_KEY is set',
            'APP_KEY missing. Run: php artisan key:generate'
        );

        // Shared placeholder key from an old .env.example — insecure, every
        // install must have its own.
        if ($appKey === 'base64:vsErht3mQKV4WSCC6R+0fgr00Th1X9WvfCeIAI7J4Kg=') {
            $this->line('<fg=red>FAIL</> APP_KEY is the shared placeholder. Run: php artisan key:generate');
            $this->failures++;
        }

        // Stale cached config masks .env edits — a frequent "persistent error".
        if (is_file(base_path('bootstrap/cache/config.php'))) {
            $this->line('INFO config is cached (bootstrap/cache/config.php). If .env changes are not taking effect, run: php artisan optimize:clear');
        }

        // storage writable
        $this->check(
            is_dir(storage_path()) && is_writable(storage_path()),
            'storage/ is writable',
            'storage/ is not writable. Run: chmod -R 775 storage'
        );

        // bootstrap/cache writable
        $this->check(
            is_dir(base_path('bootstrap/cache')) && is_writable(base_path('bootstrap/cache')),
            'bootstrap/cache/ is writable',
            'bootstrap/cache/ is not writable. Run: chmod -R 775 bootstrap/cache'
        );

        // public/build
        $this->check(
            is_file(public_path('build/manifest.json')),
            'public/build exists (compiled assets)',
            'public/build missing. Run: npm install && npm run build'
        );

        // DB connection (only if credentials look configured)
        $this->checkDatabase();

        // Install lock
        if (InstalledState::isInstalled()) {
            $this->line('INFO install lock present (app is installed). /install is disabled.');
        } else {
            $this->line('INFO not installed yet. Visit /install to finish setup.');
        }

        // Node version (only relevant when building from source)
        $this->checkNode();

        $this->newLine();

        if ($this->failures > 0) {
            $this->error("{$this->failures} check(s) failed. Fix the FAIL items above before going live.");

            return self::FAILURE;
        }

        $this->info('All checks passed.');

        return self::SUCCESS;
    }

    private function check(bool $passed, string $passMessage, string $failMessage): void
    {
        if ($passed) {
            $this->line('<fg=green>PASS</> '.$passMessage);
        } else {
            $this->line('<fg=red>FAIL</> '.$failMessage);
            $this->failures++;
        }
    }

    private function checkDatabase(): void
    {
        $database = config('database.connections.'.config('database.default').'.database');

        // Skip silently if DB is not configured yet (pre-installer state).
        if (empty($database) || $database === 'kiteledger') {
            $this->line('INFO database not configured yet — the web installer will set DB credentials.');

            return;
        }

        try {
            DB::connection()->getPdo();
            $this->line('<fg=green>PASS</> database connection works');
        } catch (Throwable $e) {
            $this->line('<fg=red>FAIL</> database connection failed: '.$e->getMessage());
            $this->failures++;
        }
    }

    private function checkNode(): void
    {
        if (! is_file(base_path('package.json'))) {
            return;
        }

        $version = @shell_exec('node -v 2>&1');

        if ($version === null || $version === '' || ! str_starts_with(trim((string) $version), 'v')) {
            $this->line('INFO Node not detected. Needed only to build assets (npm run build), not at runtime.');

            return;
        }

        $this->line('<fg=green>PASS</> Node '.trim($version).' detected');
    }
}
