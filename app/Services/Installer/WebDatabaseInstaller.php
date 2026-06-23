<?php

namespace App\Services\Installer;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\FullPermissionUserSeeder;
use Illuminate\Database\SQLiteConnection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class WebDatabaseInstaller
{
    public function run(callable $progress): array
    {
        @set_time_limit(0);
        @ini_set('memory_limit', '-1');

        $progress('Preparing the configured database connection.', 'Preparing database');
        $this->ensureSqliteDatabaseExists();

        $driver = DB::connection()->getDriverName();
        $dumpPath = database_path('sql/mysql_install.sql');

        if (in_array($driver, ['mysql', 'mariadb'], true) && is_file($dumpPath)) {
            $progress('Importing database/sql/mysql_install.sql.', 'Importing SQL dump');
            $this->dropAllTables($progress);
            $this->importDump($dumpPath);

            $progress('Ensuring the administrator account exists.', 'Seeding administrator');
            $this->callArtisan('db:seed', [
                '--force' => true,
                '--no-interaction' => true,
                '--class' => FullPermissionUserSeeder::class,
            ]);
        } else {
            $progress('Running migrations. This can take several minutes on shared hosting.', 'Running migrations');
            $this->callArtisan('migrate:fresh', ['--force' => true, '--no-interaction' => true]);

            $progress('Seeding production defaults and the administrator account.', 'Seeding database');
            $this->callArtisan('db:seed', [
                '--force' => true,
                '--no-interaction' => true,
                '--class' => DatabaseSeeder::class,
            ]);
        }

        $progress('Creating the public storage link when the host allows it.', 'Linking storage');
        $this->callOptionalArtisan('storage:link', ['--force' => true, '--no-interaction' => true]);

        $progress('Clearing cached framework files.', 'Clearing caches');
        $this->callOptionalArtisan('optimize:clear', ['--no-interaction' => true]);

        return [
            'status' => 'success',
            'message' => 'Application has been successfully installed.',
        ];
    }

    private function ensureSqliteDatabaseExists(): void
    {
        if (! DB::connection() instanceof SQLiteConnection) {
            return;
        }

        $database = DB::connection()->getDatabaseName();

        if (! is_file($database)) {
            $directory = dirname($database);

            if (! is_dir($directory)) {
                @mkdir($directory, 0775, true);
            }

            touch($database);
            DB::reconnect(Config::get('database.default'));
        }
    }

    private function dropAllTables(callable $progress): void
    {
        $tables = DB::getSchemaBuilder()->getTableListing();

        if ($tables === []) {
            return;
        }

        $progress('Removing existing tables from the target database.', 'Resetting database');
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            foreach ($tables as $table) {
                DB::statement('DROP TABLE IF EXISTS `'.str_replace('`', '``', $table).'`');
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    private function importDump(string $path): void
    {
        $sql = @file_get_contents($path);

        if ($sql === false || trim($sql) === '') {
            throw new RuntimeException("The SQL dump is empty or unreadable: {$path}");
        }

        DB::unprepared($sql);
    }

    private function callArtisan(string $command, array $arguments = []): void
    {
        $exitCode = Artisan::call($command, $arguments);
        $output = trim(Artisan::output());

        if ($exitCode !== 0) {
            throw new RuntimeException($output !== '' ? $output : "Artisan command failed: {$command}");
        }
    }

    private function callOptionalArtisan(string $command, array $arguments = []): void
    {
        try {
            $this->callArtisan($command, $arguments);
        } catch (Throwable) {
            // Symlinks and cache clearing can be unavailable on some shared hosts;
            // neither should make an otherwise successful installation fail.
        }
    }
}
