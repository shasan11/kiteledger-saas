<?php

namespace App\Services\Installer;

use Database\Seeders\CentralDatabaseSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

class InstallerDatabaseService
{
    public const FULL_DEMO_COMMAND = 'php artisan kiteledger:seed-demo --profile=full --force';

    public function installFresh(): void
    {
        $this->installBaseData();
    }

    public function installQuickDemo(): void
    {
        $this->installBaseData();
        $this->runQuickDemoSeed();
    }

    public function installFullDemoInstructionOnly(): void
    {
        $this->installBaseData();
        Log::info('Full demo browser install stopped after base data.', ['command' => self::FULL_DEMO_COMMAND]);
    }

    public function hasMysqlInstallDump(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)
            && is_file($this->dumpPath())
            && $this->dumpContainsAllCentralMigrations($this->dumpPath());
    }

    public function importMysqlInstallDump(): void
    {
        if (! $this->hasMysqlInstallDump()) {
            throw new RuntimeException('The packaged MySQL installation dump is not available for this database connection.');
        }

        $path = $this->dumpPath();
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException('The MySQL installation dump could not be opened.');
        }

        Log::info('MySQL installation dump import started.', [
            'path' => 'database/sql/mysql_install.sql',
            'bytes' => filesize($path) ?: null,
        ]);
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            foreach ($this->sqlStatements($handle) as $statement) {
                DB::unprepared($statement);
            }
        } catch (Throwable $e) {
            throw new RuntimeException('Could not import the packaged MySQL installation database: '.$e->getMessage(), 0, $e);
        } finally {
            fclose($handle);
            try {
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            } catch (Throwable) {
                // Keep the original import exception if the connection was lost.
            }
        }

        Log::info('MySQL installation dump import finished.');
    }

    public function runFreshMigrationsAndSeed(): void
    {
        Log::info('Fresh migration started.');
        Artisan::call('migrate:fresh', ['--force' => true]);
        Log::info('Fresh migration finished.');
        Log::info('Production-safe seed started.');
        Artisan::call('db:seed', ['--class' => CentralDatabaseSeeder::class, '--force' => true]);
        Log::info('Production-safe seed finished.');
    }

    public function runQuickDemoSeed(): void
    {
        Log::info('Quick demo mode is tenant-scoped and will be available when a demo tenant is provisioned.');
    }

    private function installBaseData(): void
    {
        $this->assertDatabaseIsEmpty();

        if ($this->hasMysqlInstallDump()) {
            Log::info('Installer selected packaged SQL dump.', ['used_sql_dump' => true]);
            $this->importMysqlInstallDump();
            // The packaged dump deliberately contains no buyer credentials.
            // Re-run the idempotent central seeder so the administrator entered
            // in the wizard is created after the dump has been imported.
            Artisan::call('db:seed', ['--class' => CentralDatabaseSeeder::class, '--force' => true]);

            return;
        }

        Log::info('Installer selected migration fallback.', [
            'used_sql_dump' => false,
            'dump_present' => is_file($this->dumpPath()),
            'driver' => DB::connection()->getDriverName(),
        ]);
        $this->runFreshMigrationsAndSeed();
    }

    protected function dumpPath(): string
    {
        return database_path('sql/mysql_install.sql');
    }

    private function dumpContainsAllCentralMigrations(string $path): bool
    {
        $dump = file_get_contents($path);

        if ($dump === false) {
            return false;
        }

        foreach (glob(database_path('migrations/*.php')) ?: [] as $migration) {
            if (! str_contains($dump, pathinfo($migration, PATHINFO_FILENAME))) {
                return false;
            }
        }

        return true;
    }

    private function assertDatabaseIsEmpty(): void
    {
        $tables = Schema::getTableListing(DB::connection()->getDatabaseName(), false);

        if ($tables === []) {
            return;
        }

        if (in_array('migrations', $tables, true)) {
            throw new RuntimeException('Recovery required: this database already contains Laravel migrations but no install lock exists. The browser installer will not erase it. Restore the missing install lock, select an empty database, or use the forced CLI installer only when you intend to replace all data.');
        }

        throw new RuntimeException('The selected database is not empty. The browser installer will not overwrite existing data. Select a new empty database and retry.');
    }

    /** @param resource $handle @return \Generator<int, string> */
    private function sqlStatements($handle): \Generator
    {
        $statement = '';
        $quote = null;
        $escaped = false;

        while (($line = fgets($handle)) !== false) {
            $trimmed = ltrim($line);
            if ($quote === null && ($trimmed === '' || str_starts_with($trimmed, '-- ') || str_starts_with($trimmed, '#'))) {
                continue;
            }

            for ($index = 0, $length = strlen($line); $index < $length; $index++) {
                $character = $line[$index];
                $statement .= $character;

                if ($escaped) {
                    $escaped = false;

                    continue;
                }
                if ($character === '\\' && $quote !== null) {
                    $escaped = true;

                    continue;
                }
                if ($quote !== null) {
                    if ($character === $quote) {
                        if (($line[$index + 1] ?? null) === $quote) {
                            $statement .= $line[++$index];
                        } else {
                            $quote = null;
                        }
                    }

                    continue;
                }
                if ($character === "'" || $character === '"' || $character === '`') {
                    $quote = $character;
                } elseif ($character === ';') {
                    $sql = trim($statement);
                    $statement = '';
                    if ($sql !== '' && $sql !== ';') {
                        yield $sql;
                    }
                }
            }
        }

        if (trim($statement) !== '') {
            yield trim($statement);
        }
    }
}
