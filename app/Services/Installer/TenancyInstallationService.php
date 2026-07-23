<?php

namespace App\Services\Installer;

use App\Models\Central\CentralAdmin;
use App\Services\SaaS\DatabaseProvisioning\CpanelUapiDatabaseProvisioner;
use App\Services\SaaS\DatabaseProvisioning\ManualDatabaseProvisioner;
use App\Services\SaaS\DatabaseProvisioning\MySqlDatabaseProvisioner;
use App\Support\Installer\InstalledState;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TenancyInstallationService
{
    public function requirements(): array
    {
        $items = ['php' => version_compare(PHP_VERSION, config('installer.core.minPhpVersion', '8.3.0'), '>=')];
        foreach (config('installer.requirements', []) as $extension) $items[$extension] = extension_loaded($extension);

        return $items;
    }

    public function permissions(): array
    {
        return collect(config('installer.permissions', []))->mapWithKeys(function ($mode, $path): array {
            $absolute = base_path(trim((string) $path, './'));
            return [$path => ['writable' => is_dir($absolute) && is_writable($absolute), 'required' => $mode]];
        })->all();
    }

    public function testCentralDatabase(): bool
    {
        DB::connection(config('tenancy.database.central_connection'))->getPdo();

        return true;
    }

    public function testTenantProvisioning(string $mode, array $credentials = []): bool
    {
        return match ($mode) {
            'manual' => (function () use ($credentials): bool { app(ManualDatabaseProvisioner::class)->verify($credentials); return true; })(),
            'mysql' => app(MySqlDatabaseProvisioner::class)->available(),
            'cpanel' => app(CpanelUapiDatabaseProvisioner::class)->available(),
            default => false,
        };
    }

    public function finalize(array $admin = []): void
    {
        $this->testCentralDatabase();
        $this->artisan('migrate', ['--force' => true]);
        $this->artisan('db:seed', ['--class' => 'Database\\Seeders\\CentralDatabaseSeeder', '--force' => true]);
        if (filled($admin['email'] ?? null)) {
            CentralAdmin::query()->updateOrCreate(['email' => $admin['email']], [
                'name' => $admin['name'] ?? 'Super Administrator',
                'password' => Hash::make((string) $admin['password']), 'role' => 'super_admin', 'is_active' => true,
            ]);
        }
        InstalledState::mark();
    }

    public function installed(): bool
    {
        return InstalledState::isInstalled();
    }

    private function artisan(string $command, array $arguments): void
    {
        if (Artisan::call($command, $arguments) !== 0) throw new \RuntimeException($command.' failed.');
    }
}
