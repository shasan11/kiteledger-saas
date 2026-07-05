<?php

namespace App\Console\Commands;

use App\Models\Central\Tenant;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
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
        $missing = array_values(array_diff(['ctype', 'curl', 'dom', 'fileinfo', 'filter', 'intl', 'json', 'mbstring', 'openssl', 'pdo', 'tokenizer', 'xml'], array_map('strtolower', get_loaded_extensions())));
        $checks['extensions'] = $this->check($missing === [], $missing ? 'missing: '.implode(', ', $missing) : 'required extensions loaded');
        $central = config('tenancy.database.central_connection');
        $checks['central_db'] = $this->guard(fn () => 'connected ('.DB::connection($central)->getDriverName().')');
        $databaseAvailable = $checks['central_db']['ok'];
        $checks['central_schema'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($central): string {
            if (! Schema::connection($central)->hasTable('tenants') || ! Schema::connection($central)->hasTable('tenant_provisioning_attempts')) {
                throw new \RuntimeException('central_migrations_pending');
            }

            return 'central migrations current';
        });

        $driver = $provisioners->driver();
        $checks['database_provisioner'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($driver): string {
            if (! $driver->available()) {
                throw new \RuntimeException($driver->diagnostic());
            }

            return config('saas.database.mode').': '.$driver->diagnostic();
        });
        if ($this->option('active-probes') && config('saas.database.mode') === 'automatic') {
            $checks['database_active_probe'] = $this->databaseProbe($central);
        }

        $checks['queue'] = $this->check(config('queue.default') === 'database' && filled(config('queue.connections.database.connection')), 'connection='.config('queue.default').', central='.config('queue.connections.database.connection'));
        $checks['session'] = $this->check(config('session.driver') === 'database' && config('session.domain') === null, 'driver='.config('session.driver').'; SESSION_DOMAIN must remain null');
        $checks['cache'] = $this->check(config('cache.default') === 'database', 'store='.config('cache.default'));
        $checks['environment'] = $this->check(config('app.env') === 'production' && ! config('app.debug') && filled(config('app.key')) && str_starts_with(config('app.url'), 'https://'), 'APP_ENV=production, APP_DEBUG=false, APP_KEY set, HTTPS APP_URL required');
        $checks['domains'] = $this->check(filled(config('saas.base_domain')) && ! in_array(config('saas.base_domain'), ['localhost', '127.0.0.1'], true) && config('tenancy.central_domains') !== [], 'base='.config('saas.base_domain').'; central='.implode(',', config('tenancy.central_domains')));
        $checks['mail'] = $this->check(config('mail.default') !== 'log', 'mailer='.config('mail.default'));
        $checks['writable'] = $this->writableCheck();
        $checks['scheduler'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function () use ($central): string {
            $heartbeat = Schema::connection($central)->hasTable('saas_heartbeats') ? DB::connection($central)->table('saas_heartbeats')->where('name', 'scheduler')->value('last_seen_at') : null;
            if (! $heartbeat || now()->diffInMinutes($heartbeat, true) > 5) {
                throw new \RuntimeException('scheduler heartbeat stale or missing');
            }

            return 'last seen '.$heartbeat;
        });
        $checks['tenants'] = ! $databaseAvailable ? $this->check(false, 'skipped: central database unavailable') : $this->guard(function (): string {
            $failed = Tenant::where('status', 'provisioning_failed')->count();
            if ($failed) {
                throw new \RuntimeException("{$failed} provisioning failure(s)");
            }

            return 'no provisioning failures';
        });

        if ($this->option('json')) {
            $this->line(json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->table(['Check', 'OK', 'Detail'], collect($checks)->map(fn ($value, $key) => [$key, $value['ok'] ? 'yes' : 'no', $value['detail']])->values()->all());
        }

        return collect($checks)->every(fn (array $check) => $check['ok']) ? self::SUCCESS : self::FAILURE;
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

    private function guard(callable $probe): array
    {
        try {
            DB::connection(config('tenancy.database.central_connection'))->getPdo();

            return $this->check(true, (string) $probe());
        } catch (\Throwable $e) {
            return $this->check(false, class_basename($e).': operation failed');
        }
    }

    private function check(bool $ok, string $detail): array
    {
        return ['ok' => $ok, 'detail' => $detail];
    }
}
