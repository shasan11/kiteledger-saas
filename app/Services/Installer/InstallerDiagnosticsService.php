<?php

namespace App\Services\Installer;

use App\Models\Central\TenantDatabasePool;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
use App\Support\Installer\InstalledState;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class InstallerDiagnosticsService
{
    /** @return array<int, array{label:string,ok:bool,detail:string}> */
    public function preflight(): array
    {
        $checks = [[
            'label' => 'PHP version >= 8.3',
            'ok' => version_compare(PHP_VERSION, '8.3.0', '>='),
            'detail' => PHP_VERSION,
        ]];

        foreach ((array) config('installer.requirements', []) as $extension) {
            $checks[] = [
                'label' => "PHP extension: {$extension}",
                'ok' => extension_loaded($extension),
                'detail' => extension_loaded($extension) ? 'Available' : 'Missing',
            ];
        }

        $environmentReady = is_file(base_path('.env')) || is_writable(base_path());
        $checks[] = [
            'label' => 'Project root (.env creation)',
            'ok' => $environmentReady,
            'detail' => is_file(base_path('.env')) ? '.env exists' : (is_writable(base_path()) ? 'Writable' : 'Not writable'),
        ];

        foreach ($this->writablePaths() as $label => $path) {
            $writable = is_dir($path) && is_writable($path);
            $checks[] = [
                'label' => $label,
                'ok' => $writable,
                'detail' => match (true) {
                    ! is_dir($path) => "Missing directory: {$path}",
                    $writable => "Writable: {$path}",
                    default => "Not writable: {$path}. Make it writable by the PHP user (recommended permission: 775).",
                },
            ];
        }

        $checks[] = $this->fileCheck(
            'Compiled frontend manifest',
            public_path('build/manifest.json'),
            'Frontend build assets are missing. Upload the marketplace package, not the GitHub source ZIP.',
        );
        $checks[] = $this->fileCheck(
            'Composer vendor dependencies',
            base_path('vendor/autoload.php'),
            'Vendor dependencies are missing. Upload the marketplace package, not the GitHub source ZIP.',
        );
        $checks[] = $this->fileCheck(
            'Environment template',
            base_path('.env.example'),
            '.env.example is missing. Upload a complete marketplace package.',
        );
        $checks[] = [
            'label' => 'Vite development marker',
            'ok' => ! is_file(public_path('hot')),
            'detail' => is_file(public_path('hot')) ? 'Remove public/hot before deployment.' : 'Not present',
        ];

        return $checks;
    }

    /** @return array<int, array{label:string,ok:bool,detail:string}> */
    public function postInstall(): array
    {
        $checks = $this->preflight();
        $checks[] = ['label' => 'APP_KEY', 'ok' => filled(config('app.key')), 'detail' => filled(config('app.key')) ? 'Configured' : 'Missing'];
        $checks[] = ['label' => 'Production environment', 'ok' => app()->environment('production'), 'detail' => (string) config('app.env')];
        $checks[] = ['label' => 'Debug mode disabled', 'ok' => ! config('app.debug'), 'detail' => config('app.debug') ? 'APP_DEBUG is enabled' : 'Disabled'];
        $checks[] = ['label' => 'Install lock', 'ok' => InstalledState::isInstalled(), 'detail' => InstalledState::isInstalled() ? 'Present' : 'Missing'];

        try {
            DB::connection()->getPdo();
            $checks[] = ['label' => 'Central database', 'ok' => true, 'detail' => 'Connected'];
            $migrated = Schema::hasTable('migrations');
            $checks[] = ['label' => 'Central migrations', 'ok' => $migrated, 'detail' => $migrated ? 'Installed' : 'Missing'];
        } catch (Throwable) {
            $checks[] = ['label' => 'Central database', 'ok' => false, 'detail' => 'Connection failed'];
        }

        $queue = (string) config('queue.default');
        $checks[] = ['label' => 'Queue connection', 'ok' => $queue !== 'sync', 'detail' => $queue];
        if (in_array($queue, ['database', 'central'], true)) {
            $checks[] = ['label' => 'Failed jobs table', 'ok' => Schema::hasTable('failed_jobs'), 'detail' => Schema::hasTable('failed_jobs') ? 'Available' : 'Missing'];
        }

        $mode = (string) config('saas.database.mode', 'pool');
        try {
            $driver = app(DatabaseProvisionerManager::class)->driver($mode);
            $checks[] = ['label' => 'Tenant database provisioning', 'ok' => $driver->available(), 'detail' => $mode.': '.$driver->diagnostic()];
        } catch (Throwable) {
            $checks[] = ['label' => 'Tenant database provisioning', 'ok' => false, 'detail' => $mode.': driver unavailable'];
        }

        if ($mode === 'pool' && Schema::hasTable('tenant_database_pool')) {
            $count = TenantDatabasePool::query()->where('status', 'available')->whereNotNull('validated_at')->count();
            $checks[] = ['label' => 'Available pool database', 'ok' => $count > 0, 'detail' => "{$count} validated"];
        }

        $linked = is_link(public_path('storage')) || is_dir(public_path('storage'));
        $checks[] = ['label' => 'Public storage link', 'ok' => $linked, 'detail' => $linked ? 'Present' : 'Not created'];
        $checks[] = ['label' => 'Cron jobs tutorial', 'ok' => true, 'detail' => 'Shown below'];

        return $checks;
    }

    /** @return array<string, string> */
    private function writablePaths(): array
    {
        return [
            'storage/' => storage_path(),
            'storage/app' => storage_path('app'),
            'storage/framework' => storage_path('framework'),
            'storage/framework/cache' => storage_path('framework/cache'),
            'storage/framework/sessions' => storage_path('framework/sessions'),
            'storage/framework/views' => storage_path('framework/views'),
            'storage/logs' => storage_path('logs'),
            'bootstrap/cache' => base_path('bootstrap/cache'),
        ];
    }

    /** @return array{label:string,ok:bool,detail:string} */
    private function fileCheck(string $label, string $path, string $missingMessage): array
    {
        return ['label' => $label, 'ok' => is_file($path), 'detail' => is_file($path) ? 'Present' : $missingMessage];
    }
}
