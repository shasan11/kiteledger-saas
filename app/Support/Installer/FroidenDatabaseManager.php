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
            // The install-type step (InstallTypeController) records the user's
            // choice. Demo data is only seeded when explicitly chosen — a fresh
            // install always runs the lightweight default seeder.
            $type = (string) session(\App\Http\Controllers\Installer\InstallTypeController::SESSION_KEY, 'fresh');

            Log::info('Web installer seed started.', ['type' => $type]);

            if ($type === 'quick') {
                Artisan::call('db:seed', [
                    '--class' => \Database\Seeders\DemoLiteSeeder::class,
                    '--force' => true,
                ]);
            } else {
                Artisan::call('db:seed', [
                    '--force' => true,
                ]);
            }

            Log::info('Web installer seed finished.', ['type' => $type]);

            return $this->response(
                $type === 'full'
                    ? 'Full demo data cannot be seeded from browser installation. Please run: php artisan kiteledger:seed-demo --profile=full --force'
                    : ($type === 'quick' ? 'Quick demo installation completed with sample data.' : 'Fresh installation completed.'),
                'success'
            );
        } catch (Throwable $e) {
            Log::error('Web installer seed failed.', [
                'message' => $e->getMessage(),
            ]);

            return $this->response(
                'Demo data seeding failed. Installation completed, but demo records were not fully created. Retry with: php artisan kiteledger:seed-demo --profile=quick',
                'success'
            );
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
