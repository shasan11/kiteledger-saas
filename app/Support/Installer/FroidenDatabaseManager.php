<?php

namespace App\Support\Installer;

use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Illuminate\Database\SQLiteConnection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class FroidenDatabaseManager extends DatabaseManager
{
    public function migrateAndSeed()
    {
        $this->sqlite();

        $response = $this->migrate();

        if ($response['status'] !== 'success') {
            return $response;
        }

        return $this->seed();
    }

    private function migrate(): array
    {
        try {
            Log::info('Web installer schema migration started.');

            Artisan::call('migrate:fresh', [
                '--force' => true,
            ]);

            Log::info('Web installer schema migration finished.');

            return $this->response('Database schema installed.', 'success');
        } catch (Throwable $e) {
            Log::error('Web installer schema migration failed.', [
                'message' => $e->getMessage(),
            ]);

            return $this->response($e->getMessage());
        }
    }

    private function seed(): array
    {
        try {
            Log::info('Web installer seed started.');

            Artisan::call('db:seed', [
                '--force' => true,
            ]);

            Log::info('Web installer seed finished.');

            return $this->response(trans('installer_messages.final.finished'), 'success');
        } catch (Throwable $e) {
            Log::error('Web installer seed failed.', [
                'message' => $e->getMessage(),
            ]);

            return $this->response($e->getMessage());
        }
    }

    private function response(string $message, string $status = 'danger'): array
    {
        return [
            'status' => $status,
            'message' => $message,
        ];
    }

    private function sqlite(): void
    {
        if (! DB::connection() instanceof SQLiteConnection) {
            return;
        }

        $database = DB::connection()->getDatabaseName();

        if (! file_exists($database)) {
            touch($database);
            DB::reconnect(Config::get('database.default'));
        }
    }
}
