<?php

namespace App\Console\Commands;

use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
use App\Support\Installer\InstalledState;
use Database\Seeders\TenantDatabaseSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SaasHealthCommand extends Command
{
    protected $signature = 'saas:health {--json : Output JSON} {--active-probes : Permit temporary CREATE/DROP database probe in automatic mode}';

    protected $description = 'Report production and cPanel readiness without exposing credentials';

    public function handle(DatabaseProvisionerManager $provisioners): int
    {
        $checks = [];
        $checks['php'] = $this->check(version_compare(PHP_VERSION, '8.3.0', '>='), PHP_VERSION.' (requires >= 8.3)');
        $missing = array_values(array_diff(['ctype', 'curl', 'dom', 'fileinfo', 'filter', 'json', 'mbstring', 'openssl', 'pdo', 'pdo_mysql', 'tokenizer', 'xml'], array_map('strtolower', get_loaded_extensions())));
        $checks['extensions'] = $this->check($missing === [], $missing ? 'missing: '.implode(', ', $missing) : 'required extensions loaded');
        $checks['installed'] = $this->check(InstalledState::isInstalled(), InstalledState::isInstalled() ? 'install lock and runtime files verified' : 'installation incomplete or recovery required');
        $checks['production_environment'] = $this->check(config('app.env') === 'production', 'APP_ENV='.config('app.env'));
        $checks['debug_disabled'] = $this->check(! config('app.debug'), 'APP_DEBUG='.(config('app.debug') ? 'true' : 'false'));
        $checks['app_url'] = $this->check(filled(config('app.url')) && str_starts_with(config('app.url'), 'https://'), 'HTTPS APP_URL required');
        $central = config('tenancy.database.central_connection');
        $checks['central_db'] = $this->guard(fn () => 'connected ('.DB::connection($central)->getDriverName().')');
        $databaseAvailable = $checks['central_db']['ok'];
        $checks['central_migrations'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($central): string {
            if (! Schema::connection($central)->hasTable('migrations') || ! Schema::connection($central)->hasTable('tenants') || ! Schema::connection($central)->hasTable('tenant_provisioning_attempts')) {
                throw new \RuntimeException('central_migrations_pending');
            }

            return 'central migrations present';
        });
        $queueConnection = (string) config('queue.default');
        $queueDatabase = (string) config("queue.connections.{$queueConnection}.connection");
        $queueTable = (string) config("queue.connections.{$queueConnection}.table", 'jobs');
        $failedJobsConnection = (string) config('queue.failed.database', $queueDatabase);
        $failedJobsTable = (string) config('queue.failed.table', 'failed_jobs');
        $checks['central_queue'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($central, $queueConnection, $queueDatabase): string {
            if ($queueConnection !== 'central' || config("queue.connections.{$queueConnection}.driver") !== 'database' || $queueDatabase === '') {
                throw new \RuntimeException('queue_configuration_invalid');
            }
            DB::connection($queueDatabase)->getPdo();
            if ($queueDatabase !== $central) {
                throw new \RuntimeException('queue_not_on_central_connection');
            }

            return "connection={$queueConnection}, database={$queueDatabase}";
        });
        $checks['jobs_table'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($queueDatabase, $queueTable): string {
            if (! Schema::connection($queueDatabase)->hasTable($queueTable)) {
                throw new \RuntimeException('jobs_table_missing');
            }

            return "table={$queueTable}";
        });
        $checks['failed_jobs_table'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($failedJobsConnection, $failedJobsTable): string {
            if (! Schema::connection($failedJobsConnection)->hasTable($failedJobsTable)) {
                throw new \RuntimeException('failed_jobs_table_missing');
            }

            return "table={$failedJobsTable}";
        });

        $driver = $provisioners->driver();
        $checks['provisioning_mode'] = $this->check(in_array(config('saas.database.mode'), ['pool', 'cpanel_uapi', 'automatic'], true), 'mode='.config('saas.database.mode'));
        $checks['provisioner_availability'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($driver): string {
            if (! $driver->available()) {
                throw new \RuntimeException($driver->diagnostic());
            }

            return config('saas.database.mode').': '.$driver->diagnostic();
        });
        $checks['pool_availability'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function (): string {
            if (config('saas.database.mode') !== 'pool') {
                return 'not using pool mode';
            }
            $count = TenantDatabasePool::query()->where('status', 'available')->whereNotNull('validated_at')->count();
            if ($count < 1) {
                throw new \RuntimeException('pool_exhausted');
            }

            return "{$count} validated database(s) available";
        });
        if ($this->option('active-probes') && config('saas.database.mode') === 'automatic') {
            $checks['database_active_probe'] = $this->databaseProbe($central);
        }

        $checks['session'] = $this->check(in_array(config('session.driver'), ['file', 'database'], true) && config('session.domain') === null, 'driver='.config('session.driver').'; SESSION_DOMAIN must remain null');
        $checks['cache'] = $this->check(in_array(config('cache.default'), ['file', 'database', 'array'], true), 'store='.config('cache.default'));
        $checks['base_domain'] = $this->check(filled(config('saas.base_domain')) && ! in_array(config('saas.base_domain'), ['localhost', '127.0.0.1'], true), 'base='.config('saas.base_domain'));
        $checks['central_domains'] = $this->check(config('tenancy.central_domains') !== [], 'central='.implode(',', config('tenancy.central_domains')));
        $checks['mail'] = $this->check(config('mail.default') !== 'log', 'mailer='.config('mail.default'), false);
        $checks['tenant_migrations'] = $this->check(is_dir(database_path('migrations/tenant')), 'path='.database_path('migrations/tenant'));
        $checks['tenant_seeder'] = $this->check(class_exists(TenantDatabaseSeeder::class), TenantDatabaseSeeder::class);
        $checks['writable'] = $this->writableCheck();
        $checks['public_storage'] = $this->publicStorageCheck();
        $checks['scheduler_heartbeat'] = $this->heartbeatCheck($central, 'scheduler');
        $checks['queue_heartbeat'] = $this->heartbeatCheck($central, 'queue');
        $checks['tenant_provisioning_failures'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable', false) : $this->guard(function (): string {
            $failed = Tenant::where('status', 'provisioning_failed')->count();
            if ($failed) {
                throw new \RuntimeException("{$failed} provisioning failure(s)");
            }

            return 'no provisioning failures';
        }, false);

        if ($this->option('json')) {
            $this->line(json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->table(['Check', 'OK', 'Required', 'Detail'], collect($checks)->map(fn ($value, $key) => [$key, $value['ok'] ? 'yes' : 'no', $value['required'] ? 'yes' : 'no', $value['detail']])->values()->all());
        }

        return collect($checks)->every(fn (array $check) => $check['ok'] || ! $check['required']) ? self::SUCCESS : self::FAILURE;
    }

    private function databaseProbe(string $connection): array
    {
        return $this->guard(function () use ($connection): string {
            $prefix = preg_replace('/[^A-Za-z0-9_]/', '', config('tenancy.database.prefix'));
            $name = substr($prefix.'health_'.bin2hex(random_bytes(4)), 0, 64);
            DB::connection($connection)->statement("CREATE DATABASE `{$name}`");
            try {
                return 'temporary database creation succeeded';
            } finally {
                DB::connection($connection)->statement("DROP DATABASE `{$name}`");
            }
        });
    }

    private function writableCheck(): array
    {
        $bad = collect([storage_path(), storage_path('app'), storage_path('framework'), storage_path('logs'), base_path('bootstrap/cache')])->reject(fn ($path) => is_dir($path) && is_writable($path));

        return $this->check($bad->isEmpty(), $bad->isEmpty() ? 'runtime directories writable' : 'not writable: '.$bad->join(', '));
    }

    private function publicStorageCheck(): array
    {
        $public = public_path('storage');
        $target = storage_path('app/public');

        if (! is_dir($target) || ! is_writable($target)) {
            return $this->check(false, 'storage/app/public is missing or not writable', false);
        }
        if (is_link($public)) {
            return $this->check(true, 'public/storage symlink present', false);
        }
        if (is_dir($public)) {
            return $this->check(true, 'public/storage directory present', false);
        }

        return $this->check(false, 'public/storage not linked; use private download routes or create the link when supported', false);
    }

    private function heartbeatCheck(string $connection, string $name): array
    {
        return $this->guard(function () use ($connection, $name): string {
            if (! Schema::connection($connection)->hasTable('saas_heartbeats')) {
                throw new \RuntimeException('heartbeat_table_missing');
            }
            $heartbeat = DB::connection($connection)->table('saas_heartbeats')->where('name', $name)->value('last_seen_at');
            if (! $heartbeat) {
                throw new \RuntimeException("{$name} heartbeat missing");
            }
            if (now()->diffInMinutes($heartbeat, true) > 5) {
                throw new \RuntimeException("{$name} heartbeat stale");
            }

            return 'last seen '.$heartbeat;
        }, false);
    }

    private function guard(callable $probe, bool $required = true): array
    {
        try {
            DB::connection(config('tenancy.database.central_connection'))->getPdo();

            return $this->check(true, (string) $probe(), $required);
        } catch (\Throwable $e) {
            $message = $e instanceof \RuntimeException ? $e->getMessage() : 'operation failed';

            return $this->check(false, class_basename($e).': '.$message, $required);
        }
    }

    private function check(bool $ok, string $detail, bool $required = true): array
    {
        return ['ok' => $ok, 'required' => $required, 'detail' => $detail];
    }
}
