<?php

namespace App\Services\Installer;

use App\Support\Central\SuperAdministratorProvisioner;
use App\Support\Installer\InstalledState;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

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

    public function finalize(array $admin = []): void
    {
        $this->testCentralDatabase();
        $this->artisan('migrate', ['--force' => true]);
        $this->artisan('db:seed', ['--class' => 'Database\\Seeders\\CentralDatabaseSeeder', '--force' => true]);
        if (filled($admin['email'] ?? null)) {
            SuperAdministratorProvisioner::ensure(
                (string) $admin['email'],
                $admin['name'] ?? 'Super Administrator',
                (string) ($admin['password'] ?? ''),
            );
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
