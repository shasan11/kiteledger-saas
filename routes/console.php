<?php

use App\Models\Central\CentralAdmin;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDeletionRequest;
use App\Models\Central\TenantInvoice;
use App\Services\SaaS\AtomicQuotaManager;
use App\Services\SaaS\TenantDeletionService;
use App\Services\SaaS\TenantProvisioningService;
use App\Services\SaaS\TenantSuspensionService;
use App\Services\SaaS\TenantUsageService;
use Database\Seeders\CentralDatabaseSeeder;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;
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

    $this->warn('Rebuilding the current database with migrations and CentralDatabaseSeeder...');
    Artisan::call('migrate:fresh', ['--force' => true]);
    $this->output->write(Artisan::output());
    Artisan::call('db:seed', ['--force' => true, '--class' => CentralDatabaseSeeder::class]);
    $this->output->write(Artisan::output());

    // Buyer credentials must never be baked into a distributable SQL file.
    // The browser installer recreates the central administrator after import.
    CentralAdmin::withTrashed()->forceDelete();

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

Artisan::command('central-admin:create {email} {--name=Super Admin} {--password=}', function (): int {
    $password = $this->option('password') ?: Str::password(20);
    CentralAdmin::updateOrCreate(['email' => $this->argument('email')], ['name' => $this->option('name'), 'password' => Hash::make($password), 'role' => 'super_admin', 'is_active' => true]);
    $this->info('Central administrator created.');
    if (! $this->option('password')) {
        $this->warn("Generated password: {$password}");
    }

    return 0;
})->purpose('Create or reset a central super administrator');

Artisan::command('tenants:provision {tenant}', function (): int {
    $tenant = Tenant::findOrFail($this->argument('tenant'));
    app(TenantProvisioningService::class)->retry($tenant);
    $this->info('Tenant provisioning dispatched.');

    return 0;
})->purpose('Provision or retry one tenant');

Artisan::command('tenants:migrate-one {tenant}', function (): int {
    return Artisan::call('tenants:migrate', ['--tenants' => [$this->argument('tenant')], '--force' => true]);
})->purpose('Run tenant migrations for one tenant');

Artisan::command('tenants:suspend-expired', function (): int {
    $service = app(TenantSuspensionService::class);
    $count = 0;
    Tenant::where('status', 'active')->where(fn ($q) => $q->where('trial_ends_at', '<', now())->whereNull('subscription_ends_at')->orWhere('subscription_ends_at', '<', now()))->chunkById(50, function ($tenants) use ($service, &$count) {
        foreach ($tenants as $tenant) {
            $service->suspend($tenant, 'Subscription or trial expired.');
            $count++;
        }
    });
    $this->info("Suspended {$count} expired tenants.");

    return 0;
})->purpose('Suspend expired tenant accounts');

Artisan::command('tenants:check-subscriptions', function (): int {
    Subscription::whereIn('status', ['active', 'trialing'])->where('current_period_ends_at', '<', now())->update(['status' => 'expired']);

    return Artisan::call('tenants:suspend-expired');
})->purpose('Refresh subscription and tenant access states');

Artisan::command('tenants:calculate-usage {tenant?}', function (): int {
    $query = Tenant::query();
    if ($id = $this->argument('tenant')) {
        $query->whereKey($id);
    }
    $service = app(TenantUsageService::class);
    $query->chunkById(25, fn ($tenants) => $tenants->each(fn ($tenant) => $service->calculate($tenant)));
    $this->info('Usage calculated.');

    return 0;
})->purpose('Calculate current tenant usage metrics');

Artisan::command('tenants:backup {tenant?}', function (): int {
    $connection = config('tenancy.database.template_tenant_connection') ?: config('tenancy.database.central_connection');
    $database = config("database.connections.{$connection}");
    if (! in_array($database['driver'] ?? null, ['mysql', 'mariadb'], true)) {
        $this->error('Automated tenant backup currently supports MySQL/MariaDB. Use the native PostgreSQL/SQLite backup tooling for other drivers.');

        return 1;
    }
    $query = Tenant::query();
    if ($id = $this->argument('tenant')) {
        $query->whereKey($id);
    }
    $directory = storage_path('app/backups/tenants/'.now()->format('Y-m-d'));
    if (! is_dir($directory)) {
        mkdir($directory, 0770, true);
    }
    foreach ($query->cursor() as $tenant) {
        $path = $directory.DIRECTORY_SEPARATOR.$tenant->id.'.sql';
        $process = new Process(['mysqldump', '--single-transaction', '--skip-comments', '--host='.$database['host'], '--port='.(string) $database['port'], '--user='.$database['username'], $tenant->database_name], base_path(), ['MYSQL_PWD' => $database['password'] ?? ''], null, 1800);
        $handle = fopen($path.'.tmp', 'wb');
        $process->run(fn (string $type, string $buffer) => $type === Process::OUT ? fwrite($handle, $buffer) : null);
        fclose($handle);
        if (! $process->isSuccessful()) {
            @unlink($path.'.tmp');
            $this->error("Backup failed for {$tenant->id}: ".$process->getErrorOutput());

            return 1;
        }
        rename($path.'.tmp', $path);
        $this->info($path);
    }

    return 0;
})->purpose('Create native SQL backups for one or all tenant databases');

Artisan::command('billing:generate-invoices', function (): int {
    $count = 0;
    Subscription::with(['tenant', 'plan'])->where('status', 'active')->where('current_period_ends_at', '<=', now()->addDays(7))->each(function ($subscription) use (&$count) {
        $exists = TenantInvoice::where('subscription_id', $subscription->id)->whereDate('due_date', $subscription->current_period_ends_at)->exists();
        if ($exists) {
            return;
        }
        $amount = $subscription->billing_cycle === 'yearly' ? $subscription->plan->price_yearly : $subscription->plan->price_monthly;
        TenantInvoice::create(['invoice_number' => 'KL-'.now()->format('Ym').'-'.str_pad((string) ($subscription->id), 6, '0', STR_PAD_LEFT), 'tenant_id' => $subscription->tenant_id, 'subscription_id' => $subscription->id, 'plan_id' => $subscription->plan_id, 'subtotal' => $amount, 'total' => $amount, 'currency' => $subscription->plan->currency, 'status' => 'issued', 'issue_date' => today(), 'due_date' => $subscription->current_period_ends_at]);
        $count++;
    });
    $this->info("Generated {$count} invoices.");

    return 0;
})->purpose('Generate upcoming subscription invoices');

Artisan::command('billing:retry-failed-payments', function (): int {
    $count = PaymentTransaction::where('status', 'failed')->where('updated_at', '<', now()->subDay())->count();
    $this->info("{$count} failed payments require provider-specific retry handling.");

    return 0;
})->purpose('List retryable failed payments for configured gateway workers');

Artisan::command('cms:sync-default-pages', function (): int {
    (new CentralDatabaseSeeder)->run();
    $this->info('Default central content synchronized.');

    return 0;
})->purpose('Create missing default website pages');

Artisan::command('templates:export {template} {--path=}', function (): int {
    $template = DefaultDataTemplate::with('items')->where('id', $this->argument('template'))->orWhere('slug', $this->argument('template'))->firstOrFail();
    $path = $this->option('path') ?: storage_path("app/templates/{$template->slug}.json");
    if (! is_dir(dirname($path))) {
        mkdir(dirname($path), 0775, true);
    }
    file_put_contents($path, json_encode($template->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $this->info($path);

    return 0;
})->purpose('Export a default-data template as JSON');

Artisan::command('templates:import {file}', function (): int {
    $data = json_decode(file_get_contents($this->argument('file')), true, 512, JSON_THROW_ON_ERROR);
    $items = $data['items'] ?? [];
    unset($data['id'],$data['items'],$data['created_at'],$data['updated_at'],$data['deleted_at']);
    $template = DefaultDataTemplate::updateOrCreate(['slug' => $data['slug']], $data);
    foreach ($items as $item) {
        unset($item['id'],$item['template_id'],$item['created_at'],$item['updated_at']);
        $template->items()->updateOrCreate(['category' => $item['category'], 'key' => $item['key']], $item);
    }
    $this->info("Imported {$template->name}.");

    return 0;
})->purpose('Import a default-data template from JSON');

Schedule::call(function (): void {
    DB::connection(config('tenancy.database.central_connection'))->table('saas_heartbeats')->updateOrInsert(['name' => 'scheduler'], ['last_seen_at' => now(), 'metadata' => json_encode(['host' => gethostname()])]);
})->everyMinute()->name('saas-heartbeat')->withoutOverlapping(5);
Schedule::call(function (): void {
    app(AtomicQuotaManager::class)->expireStale();
})->everyFifteenMinutes()->name('quota-reservation-cleanup')->withoutOverlapping(10);
Schedule::command('tenants:check-subscriptions')->dailyAt('00:15')->withoutOverlapping(30);
Schedule::command('tenants:calculate-usage')->dailyAt('01:00')->withoutOverlapping(30);
Schedule::command('billing:generate-invoices')->dailyAt('02:00')->withoutOverlapping(30);
Schedule::call(function (): void {
    TenantDeletionRequest::where('status', 'approved')->where('execute_after', '<=', now())->orderBy('execute_after')->limit(5)->get()->each(fn ($request) => app(TenantDeletionService::class)->execute($request));
})->dailyAt('03:00')->name('tenant-deletions')->withoutOverlapping(60);
