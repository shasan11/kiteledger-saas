<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Installer\InstallerDatabaseService;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class InstallCommand extends Command
{
    protected $signature = 'kiteledger:install
        {--db-connection=mysql}
        {--db-host=127.0.0.1}
        {--db-port=3306}
        {--db-database=}
        {--db-username=}
        {--db-password=}
        {--app-url=}
        {--admin-name=}
        {--admin-email=}
        {--admin-password=}
        {--install-type=fresh : fresh, quick, or full}
        {--force : Allow destructive reinstallation}';

    protected $description = 'Install KiteLedger with the same safe database pipeline as the web installer.';

    public function handle(InstallerDatabaseService $installer, InstalledFileManager $installed): int
    {
        $interactive = $this->input->isInteractive();
        $values = $this->collectValues($interactive);

        if (! in_array($values['install_type'], ['fresh', 'quick', 'full'], true)) {
            $this->error('Install type must be fresh, quick, or full.');

            return self::FAILURE;
        }

        if ($values['database'] === '' || $values['username'] === '' || $values['admin_email'] === '' || $values['admin_password'] === '') {
            $this->error('Database name, database username, admin email, and admin password are required.');

            return self::FAILURE;
        }

        $this->configureDatabase($values);

        try {
            DB::connection()->getPdo();
            if (Schema::hasTable('migrations') && ! $this->option('force')) {
                $this->error('The target database is not empty. Re-run with --force to allow a destructive reinstall.');

                return self::FAILURE;
            }

            $this->writeEnvironment($values);
            match ($values['install_type']) {
                'quick' => $installer->installQuickDemo(),
                'full' => $installer->installFullDemoInstructionOnly(),
                default => $installer->installFresh(),
            };
            $this->updateAdministrator($values);
            $installed->update();
        } catch (Throwable $e) {
            $this->error('Installation failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('KiteLedger installation completed.');
        if ($values['install_type'] === 'full') {
            $this->warn('Base data only was installed. Run: '.InstallerDatabaseService::FULL_DEMO_COMMAND);
        }

        return self::SUCCESS;
    }

    private function collectValues(bool $interactive): array
    {
        $value = fn (string $option, string $question, string $default = '') => $interactive
            ? (string) $this->ask($question, (string) ($this->option($option) ?: $default))
            : (string) $this->option($option);

        return [
            'connection' => $value('db-connection', 'Database driver', 'mysql'),
            'host' => $value('db-host', 'Database host', '127.0.0.1'),
            'port' => $value('db-port', 'Database port', '3306'),
            'database' => $value('db-database', 'Database name'),
            'username' => $value('db-username', 'Database username'),
            'password' => $interactive ? (string) $this->secret('Database password (blank if none)') : (string) $this->option('db-password'),
            'app_url' => $value('app-url', 'Application URL', 'http://localhost'),
            'admin_name' => $value('admin-name', 'Administrator name', 'KiteLedger Admin'),
            'admin_email' => $value('admin-email', 'Administrator email'),
            'admin_password' => $interactive ? (string) $this->secret('Administrator password') : (string) $this->option('admin-password'),
            'install_type' => strtolower($value('install-type', 'Install type (fresh, quick, full)', 'fresh')),
        ];
    }

    private function configureDatabase(array $values): void
    {
        $connection = $values['connection'];
        Config::set('database.default', $connection);
        Config::set("database.connections.{$connection}.host", $values['host']);
        Config::set("database.connections.{$connection}.port", $values['port']);
        Config::set("database.connections.{$connection}.database", $values['database']);
        Config::set("database.connections.{$connection}.username", $values['username']);
        Config::set("database.connections.{$connection}.password", $values['password']);
        DB::purge($connection);
    }

    private function updateAdministrator(array $values): void
    {
        $user = User::query()->where('email', 'admin@kiteledger.test')->first() ?? User::query()->orderBy('id')->firstOrFail();
        $user->forceFill([
            'name' => $values['admin_name'],
            'email' => $values['admin_email'],
            'username' => Str::slug(Str::before($values['admin_email'], '@'), '_') ?: 'admin',
            'password' => Hash::make($values['admin_password']),
            'email_verified_at' => now(),
        ])->save();
    }

    private function writeEnvironment(array $values): void
    {
        $path = base_path('.env');
        $contents = is_file($path) ? (string) file_get_contents($path) : (string) file_get_contents(base_path('.env.example'));
        $replacements = [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_URL' => $values['app_url'],
            'DB_CONNECTION' => $values['connection'],
            'DB_HOST' => $values['host'],
            'DB_PORT' => $values['port'],
            'DB_DATABASE' => $values['database'],
            'DB_USERNAME' => $values['username'],
            'DB_PASSWORD' => $values['password'],
        ];

        foreach ($replacements as $key => $rawValue) {
            $escaped = '"'.str_replace(['\\', '"', "\n", "\r"], ['\\\\', '\\"', '', ''], (string) $rawValue).'"';
            $line = $key.'='.$escaped;
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
            $contents = preg_match($pattern, $contents) ? preg_replace($pattern, $line, $contents) : rtrim($contents).PHP_EOL.$line.PHP_EOL;
        }

        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new \RuntimeException('Could not write the .env file.');
        }
    }
}
