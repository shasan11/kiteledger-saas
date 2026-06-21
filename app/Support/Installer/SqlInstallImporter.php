<?php

namespace App\Support\Installer;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class SqlInstallImporter
{
    public static function pathFor(string $connection): ?string
    {
        return match ($connection) {
            'mysql', 'mariadb' => database_path('sql/mysql_install.sql'),
            default => null,
        };
    }

    public static function availableFor(string $connection): bool
    {
        $path = self::pathFor($connection);

        return $path !== null && is_file($path) && filesize($path) > 0;
    }

    public static function importFor(string $connection): void
    {
        $path = self::pathFor($connection);

        if ($path === null || ! is_file($path)) {
            throw new RuntimeException("Install SQL file not found for {$connection}.");
        }

        $sql = file_get_contents($path);

        if ($sql === false || trim($sql) === '') {
            throw new RuntimeException("Install SQL file is empty or unreadable: {$path}");
        }

        self::assertMysqlDump($sql, $path);

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            self::dropCurrentTables();

            foreach (self::splitStatements($sql) as $statement) {
                DB::unprepared($statement);
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    private static function assertMysqlDump(string $sql, string $path): void
    {
        $sqlitePatterns = [
            'PRAGMA ',
            'sqlite_master',
            'BEGIN TRANSACTION',
            'COMMIT;',
        ];

        foreach ($sqlitePatterns as $pattern) {
            if (stripos($sql, $pattern) !== false) {
                throw new RuntimeException(
                    "The install SQL file is not a MySQL/MariaDB dump: {$path}. Delete it or regenerate it with: php artisan install:build-sql --force"
                );
            }
        }
    }

    private static function dropCurrentTables(): void
    {
        $tables = DB::select("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        $database = DB::getDatabaseName();
        $column = 'Tables_in_'.$database;

        foreach ($tables as $table) {
            $name = $table->{$column} ?? array_values((array) $table)[0] ?? null;

            if ($name) {
                Schema::drop($name);
            }
        }
    }

    /**
     * Split mysqldump output into statements while respecting quoted strings.
     *
     * @return array<int, string>
     */
    private static function splitStatements(string $sql): array
    {
        $statements = [];
        $statement = '';
        $quote = null;
        $length = strlen($sql);

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];
            $next = $sql[$i + 1] ?? '';

            if ($quote === null && $char === '-' && $next === '-') {
                while ($i < $length && ! in_array($sql[$i], ["\n", "\r"], true)) {
                    $i++;
                }

                continue;
            }

            if ($quote === null && $char === '#') {
                while ($i < $length && ! in_array($sql[$i], ["\n", "\r"], true)) {
                    $i++;
                }

                continue;
            }

            if ($quote === null && $char === '/' && $next === '*') {
                $end = strpos($sql, '*/', $i + 2);

                if ($end === false) {
                    break;
                }

                $comment = substr($sql, $i, $end - $i + 2);

                if (str_starts_with($comment, '/*!')) {
                    $statement .= $comment;
                }

                $i = $end + 1;

                continue;
            }

            $statement .= $char;

            if ($quote !== null) {
                if ($char === '\\') {
                    $statement .= $sql[++$i] ?? '';

                    continue;
                }

                if ($char === $quote) {
                    $quote = null;
                }

                continue;
            }

            if (in_array($char, ["'", '"', '`'], true)) {
                $quote = $char;

                continue;
            }

            if ($char === ';') {
                $trimmed = trim($statement);

                if ($trimmed !== '') {
                    $statements[] = rtrim($trimmed, ';');
                }

                $statement = '';
            }
        }

        $trimmed = trim($statement);

        if ($trimmed !== '') {
            $statements[] = $trimmed;
        }

        return $statements;
    }
}
