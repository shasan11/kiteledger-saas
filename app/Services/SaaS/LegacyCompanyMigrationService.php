<?php

namespace App\Services\SaaS;

use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Stancl\Tenancy\Jobs\CreateDatabase;

/**
 * Migrates a legacy single-company KiteLedger install (all ERP data sitting in
 * the original/central database) into an isolated per-tenant database.
 *
 * Design goals (see docs/LEGACY_TO_SAAS_MIGRATION.md):
 *  - Idempotent & resumable: every step records success in legacy_migration_runs
 *    and is skipped on --resume.
 *  - Non-destructive: the legacy database is NEVER truncated or dropped here.
 *  - Verifiable: row counts + key entity totals compared before completion.
 */
class LegacyCompanyMigrationService
{
    /** Framework/runtime tables that must not be copied. */
    private const SKIP_TABLES = [
        'migrations', 'cache', 'cache_locks', 'sessions', 'jobs', 'job_batches',
        'failed_jobs', 'password_reset_tokens', 'personal_access_tokens',
    ];

    /**
     * Central/platform tables. In a legacy install these live alongside the ERP
     * tables in the same database, so they must be excluded from the tenant copy.
     */
    private const CENTRAL_TABLES = [
        'central_admin_users', 'plans', 'plan_features', 'default_data_templates',
        'default_template_items', 'tenants', 'domains', 'subscriptions',
        'tenant_invoices', 'payment_gateways', 'payment_transactions',
        'tenant_payment_webhook_logs', 'website_pages', 'website_sections',
        'website_menus', 'website_content_items', 'platform_settings',
        'tenant_provisioning_logs', 'tenant_usage_metrics', 'central_audit_logs',
        'legacy_migration_runs',
    ];

    public function __construct(private TenantDomainService $domains) {}

    private function centralConnection(): string
    {
        return config('tenancy.database.central_connection');
    }

    /**
     * Classify the current install so callers can refuse to run in the wrong state.
     *
     * @return 'fresh_saas'|'legacy_single_company'|'already_migrated'
     */
    public function detectInstallationType(): string
    {
        $central = $this->centralConnection();

        if (Tenant::query()->exists()) {
            return 'already_migrated';
        }

        // A legacy install has the ERP tables (users + branches) populated in the
        // central DB. A fresh SaaS install has the schema but no ERP rows there.
        $hasErp = Schema::connection($central)->hasTable('users')
            && Schema::connection($central)->hasTable('branches');

        if ($hasErp && DB::connection($central)->table('users')->exists()) {
            return 'legacy_single_company';
        }

        return 'fresh_saas';
    }

    /**
     * Base table names belonging ONLY to the given connection's own database.
     *
     * Critical: on MySQL, Schema::getTableListing() returns schema-qualified names
     * for EVERY database the connection can see (e.g. other apps on a shared
     * server). We must scope strictly to this connection's database, otherwise the
     * migration would count/copy foreign tables.
     *
     * @return Collection<int,string>
     */
    private function ownTables(string $connection): Collection
    {
        $conn = DB::connection($connection);

        // Schema qualifier differs by driver: MySQL uses the database name, SQLite
        // uses "main", PostgreSQL uses the search-path schema ("public").
        $schema = match ($conn->getDriverName()) {
            'sqlite' => 'main',
            'pgsql' => 'public',
            default => $conn->getDatabaseName(),
        };

        return collect(Schema::connection($connection)->getTableListing())
            ->filter(fn ($t) => ! str_contains($t, '.') || Str::beforeLast($t, '.') === $schema)
            ->map(fn ($t) => Str::afterLast($t, '.'))
            ->values();
    }

    private function erpTables(Collection $tables): Collection
    {
        return $tables
            ->reject(fn ($t) => in_array($t, self::SKIP_TABLES, true) || in_array($t, self::CENTRAL_TABLES, true))
            ->values();
    }

    /**
     * ERP tables present in BOTH the legacy source and the freshly-migrated tenant
     * schema, minus framework/runtime tables. This is what gets copied.
     *
     * @return list<string>
     */
    public function copyableTables(Tenant $tenant): array
    {
        $source = $this->ownTables($this->centralConnection());
        $dest = collect($tenant->run(fn () => $this->ownTables(DB::connection()->getName())));

        return $this->erpTables($source->intersect($dest)->values())->all();
    }

    /**
     * ERP tables that would be copied, derived from the SOURCE schema alone (no
     * live tenant database required). Used for dry-run reporting.
     *
     * @return list<string>
     */
    public function plannedTables(): array
    {
        return $this->erpTables($this->ownTables($this->centralConnection()))->all();
    }

    /**
     * Run (or resume) the full migration. $collect() lazily supplies tenant details
     * only when a new run is started, so callers can prompt interactively.
     *
     * @param  array{tenant_id?:string,company_name?:string,owner_name?:string,owner_email?:string,subdomain?:string,plan_id?:int|null,country?:string|null,timezone?:string,currency?:string}  $details
     * @param  callable(string,string):void|null  $progress  step, status callback
     */
    public function run(array $details, bool $dryRun = false, bool $resume = false, ?callable $progress = null): array
    {
        $progress ??= fn () => null;
        $central = $this->centralConnection();

        $run = null;
        if ($resume) {
            $run = DB::connection($central)->table('legacy_migration_runs')
                ->where('status', 'failed')->orderByDesc('id')->first();
        }

        $steps = $run && $run->steps ? (array) json_decode($run->steps, true) : [];
        $done = fn (string $s) => ($steps[$s] ?? null) === 'success';
        $mark = function (string $s, string $status) use (&$steps, &$runId, $central, $progress): void {
            $steps[$s] = $status;
            $progress($s, $status);
            if ($runId ?? null) {
                DB::connection($central)->table('legacy_migration_runs')->where('id', $runId)
                    ->update(['steps' => json_encode($steps), 'updated_at' => now()]);
            }
        };

        $runId = $run->id ?? DB::connection($central)->table('legacy_migration_runs')->insertGetId([
            'tenant_id' => $details['tenant_id'] ?? null,
            'status' => 'running', 'dry_run' => $dryRun,
            'steps' => json_encode($steps), 'started_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        try {
            // 1. Central tenant record + primary domain.
            $tenant = $this->resolveTenant($details, $done('tenant'), $dryRun, $mark);
            DB::connection($central)->table('legacy_migration_runs')->where('id', $runId)
                ->update(['tenant_id' => $tenant?->id]);

            if ($dryRun) {
                $verification = $this->plannedVerification();
                DB::connection($central)->table('legacy_migration_runs')->where('id', $runId)->update([
                    'status' => 'completed', 'verification' => json_encode($verification),
                    'finished_at' => now(), 'updated_at' => now(),
                ]);

                return ['dry_run' => true, 'run_id' => $runId, 'verification' => $verification, 'tables' => array_keys($verification)];
            }

            // 2. Tenant database.
            if (! $done('database')) {
                if (! $tenant->database()->manager()->databaseExists($tenant->database_name)) {
                    app()->call([new CreateDatabase($tenant), 'handle']);
                }
                $mark('database', 'success');
            }

            // 3. Tenant migrations (empty ERP schema).
            if (! $done('migrations')) {
                $this->artisan('tenants:migrate', ['--tenants' => [$tenant->id], '--force' => true]);
                $mark('migrations', 'success');
            }

            // 4. Copy ERP data (idempotent per-table replace).
            if (! $done('copy')) {
                $this->copyData($tenant);
                $mark('copy', 'success');
            }

            // 5. Trial/subscription for the migrated tenant.
            if (! $done('subscription')) {
                if ($tenant->plan && ! $tenant->subscription) {
                    app(SubscriptionService::class)->start($tenant, $tenant->plan);
                }
                $mark('subscription', 'success');
            }

            // 6. Verify before marking complete.
            $verification = $this->verify($tenant);
            $mark('verify', $verification['ok'] ? 'success' : 'failed');

            if (! $verification['ok']) {
                throw new \RuntimeException('Verification failed: row-count mismatch on '.implode(', ', $verification['mismatched_tables']));
            }

            $tenant->update(['status' => $tenant->trial_ends_at?->isFuture() ? 'trialing' : 'active', 'status_reason' => null]);

            DB::connection($central)->table('legacy_migration_runs')->where('id', $runId)->update([
                'status' => 'completed', 'verification' => json_encode($verification),
                'finished_at' => now(), 'updated_at' => now(),
            ]);

            return ['dry_run' => false, 'run_id' => $runId, 'tenant_id' => $tenant->id, 'verification' => $verification];
        } catch (\Throwable $e) {
            DB::connection($central)->table('legacy_migration_runs')->where('id', $runId)->update([
                'status' => 'failed', 'steps' => json_encode($steps),
                'error' => Str::limit($e->getMessage(), 2000), 'updated_at' => now(),
            ]);
            throw $e;
        }
    }

    private function resolveTenant(array $details, bool $alreadyDone, bool $dryRun, callable $mark): ?Tenant
    {
        if (! empty($details['tenant_id'])) {
            $tenant = Tenant::find($details['tenant_id']);
            if ($tenant) {
                $mark('tenant', 'success');

                return $tenant;
            }
        }

        if ($dryRun) {
            // Validate the subdomain without persisting anything.
            $this->domains->normalizeSubdomain($details['subdomain']);
            $mark('tenant', 'planned');

            return null;
        }

        $id = (string) Str::uuid();
        $tenant = Tenant::query()->create([
            'id' => $id,
            'company_name' => $details['company_name'],
            'owner_name' => $details['owner_name'],
            'owner_email' => $details['owner_email'],
            'country' => $details['country'] ?? null,
            'timezone' => $details['timezone'] ?? 'UTC',
            'currency' => $details['currency'] ?? 'USD',
            'plan_id' => $details['plan_id'] ?? Plan::query()->where('is_active', true)->orderBy('sort_order')->value('id'),
            'status' => 'provisioning',
            'database_name' => config('tenancy.database.prefix').str_replace('-', '', $id).config('tenancy.database.suffix'),
        ]);
        $tenant->setInternal('db_name', $tenant->database_name)->save();
        $this->domains->attachSubdomain($tenant, $this->domains->normalizeSubdomain($details['subdomain']));
        $mark('tenant', 'success');

        return $tenant;
    }

    /** Copy every shared ERP table row-for-row, preserving UUIDs & relationships. */
    private function copyData(Tenant $tenant): void
    {
        $source = DB::connection($this->centralConnection());
        $tables = $this->copyableTables($tenant);

        $tenant->run(function () use ($source, $tables): void {
            $dest = DB::connection();
            $mysql = in_array($dest->getDriverName(), ['mysql', 'mariadb'], true);

            if ($mysql) {
                $dest->statement('SET FOREIGN_KEY_CHECKS=0');
            }

            try {
                foreach ($tables as $table) {
                    $dest->table($table)->truncate();
                    $batch = [];
                    foreach ($source->table($table)->cursor() as $row) {
                        $batch[] = (array) $row;
                        if (count($batch) >= 500) {
                            $dest->table($table)->insert($batch);
                            $batch = [];
                        }
                    }
                    if ($batch) {
                        $dest->table($table)->insert($batch);
                    }
                }
            } finally {
                if ($mysql) {
                    $dest->statement('SET FOREIGN_KEY_CHECKS=1');
                }
            }
        });
    }

    /**
     * Verification report: per-table row-count parity plus key entity totals.
     *
     * @return array{ok:bool,tables:array<string,array{source:int,dest:int}>,mismatched_tables:list<string>,summary:array<string,mixed>}
     */
    public function verify(Tenant $tenant): array
    {
        $source = DB::connection($this->centralConnection());
        $tables = $this->copyableTables($tenant);
        $counts = [];
        $mismatched = [];

        $destCounts = $tenant->run(function () use ($tables): array {
            $dest = DB::connection();

            return collect($tables)->mapWithKeys(fn ($t) => [$t => (int) $dest->table($t)->count()])->all();
        });

        foreach ($tables as $table) {
            $src = (int) $source->table($table)->count();
            $dst = $destCounts[$table] ?? 0;
            $counts[$table] = ['source' => $src, 'dest' => $dst];
            if ($src !== $dst) {
                $mismatched[] = $table;
            }
        }

        $summary = $tenant->run(function (): array {
            $dest = DB::connection();
            $total = fn (string $t, string $c) => Schema::hasTable($t) && Schema::hasColumn($t, $c) ? (float) $dest->table($t)->sum($c) : null;

            return [
                'users' => $dest->table('users')->count(),
                'branches' => $dest->table('branches')->count(),
                'products' => Schema::hasTable('products') ? $dest->table('products')->count() : null,
                'invoices' => Schema::hasTable('invoices') ? $dest->table('invoices')->count() : null,
                'invoice_total' => $total('invoices', 'total'),
                'journal_voucher_total' => $total('journal_voucher_lines', 'debit'),
            ];
        });

        return [
            'ok' => $mismatched === [],
            'tables' => $counts,
            'mismatched_tables' => $mismatched,
            'summary' => $summary,
        ];
    }

    /** Row counts the migration WOULD copy, for dry-run reporting. */
    private function plannedVerification(): array
    {
        $source = DB::connection($this->centralConnection());

        return collect($this->plannedTables())
            ->mapWithKeys(fn ($t) => [$t => (int) $source->table($t)->count()])
            ->all();
    }

    private function artisan(string $command, array $arguments): void
    {
        if (Artisan::call($command, $arguments) !== 0) {
            throw new \RuntimeException(trim(Artisan::output()) ?: "{$command} failed.");
        }
    }
}
