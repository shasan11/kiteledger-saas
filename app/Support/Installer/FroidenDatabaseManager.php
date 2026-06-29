<?php

namespace App\Support\Installer;

use App\Http\Controllers\Installer\InstallTypeController;
use App\Services\Installer\InstallerDatabaseService;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Illuminate\Database\SQLiteConnection;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class FroidenDatabaseManager extends DatabaseManager
{
    public function __construct(private InstallerDatabaseService $installer) {}

    public function migrateAndSeed(): array
    {
        $this->sqlite();
        $type = (string) session(InstallTypeController::SESSION_KEY, 'fresh');
        $startedAt = microtime(true);
        Log::info('Web installer database installation started.', ['type' => $type]);

        try {
            match ($type) {
                'quick' => $this->installer->installQuickDemo(),
                'full' => $this->installer->installFullDemoInstructionOnly(),
                default => $this->installer->installFresh(),
            };
        } catch (Throwable $e) {
            Log::error('Web installer database installation failed.', [
                'type' => $type,
                'seconds' => round(microtime(true) - $startedAt, 2),
                'message' => $e->getMessage(),
            ]);

            return $this->response('Database installation failed: '.$e->getMessage());
        }

        Log::info('Web installer database installation finished.', [
            'type' => $type,
            'used_sql_dump' => $this->installer->hasMysqlInstallDump(),
            'seconds' => round(microtime(true) - $startedAt, 2),
        ]);

        return $this->response(match ($type) {
            'quick' => 'Quick demo installation completed with lightweight sample data.',
            'full' => 'Base installation completed. To add full demo records, run: '.InstallerDatabaseService::FULL_DEMO_COMMAND,
            default => 'Fresh installation completed.',
        }, 'success');
    }

    private function response(string $message, string $status = 'danger'): array
    {
        return ['status' => $status, 'message' => $message];
    }

    private function sqlite(): void
    {
        if (! DB::connection() instanceof SQLiteConnection) {
            return;
        }

        $database = DB::connection()->getDatabaseName();
        if ($database !== ':memory:' && ! file_exists($database)) {
            touch($database);
            DB::reconnect(Config::get('database.default'));
        }
    }
}
