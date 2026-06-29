<?php

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('install:build-sql {--path=database/sql/mysql_install.sql} {--force : Rebuild the current database before dumping it}', function (): int {
    $connection = DB::connection();
    $driver = $connection->getDriverName();

    if (! in_array($driver, ['mysql', 'mariadb'], true)) {
        $this->error('The install SQL dump can only be generated from a mysql or mariadb connection.');

        return 1;
    }

    if (! $this->option('force')) {
        $this->error('This command runs migrate:fresh and deletes the current database contents. Re-run with --force on a temporary/clean database.');

        return 1;
    }

    $version = new Process(['mysqldump', '--version']);
    $version->run();

    if (! $version->isSuccessful()) {
        $this->error('mysqldump was not found. Install the MySQL/MariaDB client tools, then run this command again.');

        return 1;
    }

    $this->warn('Rebuilding the current database with migrations and DatabaseSeeder...');
    Artisan::call('migrate:fresh', ['--force' => true]);
    $this->output->write(Artisan::output());
    Artisan::call('db:seed', ['--force' => true, '--class' => DatabaseSeeder::class]);
    $this->output->write(Artisan::output());

    $config = $connection->getConfig();
    $database = $config['database'] ?? null;

    if (! $database) {
        $this->error('No database name is configured for the current connection.');

        return 1;
    }

    $arguments = [
        'mysqldump',
        '--single-transaction',
        '--skip-comments',
        '--default-character-set=utf8mb4',
        '--host='.($config['host'] ?? '127.0.0.1'),
        '--port='.($config['port'] ?? '3306'),
        '--user='.($config['username'] ?? ''),
    ];

    $password = $config['password'] ?? null;
    $arguments[] = $database;

    $path = base_path($this->option('path'));
    $directory = dirname($path);

    if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
        $this->error("Could not create directory: {$directory}");

        return 1;
    }

    $temporaryPath = $path.'.tmp';
    $handle = fopen($temporaryPath, 'wb');
    if ($handle === false) {
        $this->error("Could not write install SQL dump: {$path}");

        return 1;
    }

    fwrite($handle, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n");
    $environment = ($password !== null && $password !== '') ? ['MYSQL_PWD' => $password] : null;
    $dump = new Process($arguments, base_path(), $environment, null, 300);
    $dump->run(function (string $type, string $buffer) use ($handle): void {
        if ($type === Process::OUT) {
            fwrite($handle, $buffer);
        }
    });

    if (! $dump->isSuccessful()) {
        fclose($handle);
        @unlink($temporaryPath);
        $this->error($dump->getErrorOutput() ?: 'mysqldump failed.');

        return 1;
    }

    fwrite($handle, "\nSET FOREIGN_KEY_CHECKS=1;\n");
    fclose($handle);

    if (is_file($path) && ! unlink($path)) {
        @unlink($temporaryPath);
        $this->error("Could not replace existing install SQL dump: {$path}");

        return 1;
    }

    if (! rename($temporaryPath, $path)) {
        @unlink($temporaryPath);
        $this->error("Could not finalize install SQL dump: {$path}");

        return 1;
    }

    $this->info("Install SQL dump written to {$path}");

    return 0;
})->purpose('Build database/sql/mysql_install.sql from a clean MySQL/MariaDB installation database');
