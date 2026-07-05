<?php

namespace App\Console\Commands;

use App\Models\Central\Plan;
use App\Services\SaaS\LegacyCompanyMigrationService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * One-off, production-safe migration of a legacy single-company install into an
 * isolated per-tenant database. See docs/LEGACY_TO_SAAS_MIGRATION.md.
 */
class MigrateLegacyCompanyCommand extends Command
{
    protected $signature = 'saas:migrate-legacy-company
        {--dry-run : Report what would be copied without touching any tenant database}
        {--resume : Resume the most recent failed run, skipping completed steps}
        {--force : Required to run in production}
        {--backup-confirmed : Confirm a verified backup of the legacy database exists}
        {--company= : Company name for the first tenant}
        {--owner-name= : Owner display name}
        {--owner-email= : Owner email}
        {--subdomain= : Subdomain for the tenant (e.g. acme -> acme.yourdomain.com)}
        {--plan= : Plan id or slug (defaults to first active plan)}
        {--country=} {--timezone=UTC} {--currency=USD}';

    protected $description = 'Migrate a legacy single-company KiteLedger install into an isolated tenant database';

    public function handle(LegacyCompanyMigrationService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $resume = (bool) $this->option('resume');

        $type = $service->detectInstallationType();
        $this->line("Detected installation type: <info>{$type}</info>");

        if ($type === 'already_migrated' && ! $resume) {
            $this->error('Tenant records already exist. Legacy migration has already been performed. Use --resume only to finish a failed run.');

            return self::FAILURE;
        }

        if ($type === 'fresh_saas') {
            $this->error('No legacy ERP data found in the central database. Nothing to migrate.');

            return self::FAILURE;
        }

        if (app()->environment('production') && ! $dryRun && ! $this->option('force')) {
            $this->error('Running against production requires --force.');

            return self::FAILURE;
        }

        if (! $dryRun && ! $this->option('backup-confirmed')) {
            if (! $this->confirm('Have you taken and VERIFIED a full backup of the legacy database? This migration reads from it but you must be able to recover.', false)) {
                $this->error('Aborted. Take a verified backup, then re-run with --backup-confirmed.');

                return self::FAILURE;
            }
        }

        $details = $resume ? [] : $this->collectDetails();

        // --force (and Symfony's --no-interaction) implies an unattended "yes" so
        // the command can run from a deploy script without blocking on a prompt.
        $assumeYes = $this->option('force') || ! $this->input->isInteractive();

        if (! $dryRun && ! $resume && ! $assumeYes
            && ! $this->confirm("Create the first tenant for \"{$details['company_name']}\" and copy all ERP data into an isolated database? The legacy database is left untouched.", false)) {
            $this->warn('Aborted by operator.');

            return self::FAILURE;
        }

        try {
            $result = $service->run($details, $dryRun, $resume, function (string $step, string $status): void {
                $this->line(sprintf('  %-14s %s', $step, $status === 'success' ? '<info>ok</info>' : $status));
            });
        } catch (ValidationException $e) {
            $this->error(implode(' ', $e->validator->errors()->all()));

            return self::FAILURE;
        } catch (\Throwable $e) {
            $this->error('Migration failed: '.$e->getMessage());
            $this->line('Re-run with <comment>--resume</comment> once the cause is fixed.');

            return self::FAILURE;
        }

        $this->newLine();
        if ($dryRun) {
            $this->info('DRY RUN complete — no tenant database was modified.');
            $this->table(['Table', 'Rows to copy'], collect($result['verification'] ?? [])->map(fn ($c, $t) => [$t, $c])->values()->all());

            return self::SUCCESS;
        }

        $v = $result['verification'];
        $this->info("Migration complete for tenant {$result['tenant_id']}.");
        $this->line('Verification: '.($v['ok'] ? '<info>row counts match</info>' : '<error>MISMATCH: '.implode(', ', $v['mismatched_tables']).'</error>'));
        $this->table(['Metric', 'Value'], collect($v['summary'])->map(fn ($val, $k) => [$k, $val ?? '—'])->values()->all());
        $this->newLine();
        $this->line('<comment>The legacy database was NOT deleted.</comment> Verify the tenant, then archive/remove the legacy ERP tables manually once satisfied.');

        return $v['ok'] ? self::SUCCESS : self::FAILURE;
    }

    /** @return array<string,mixed> */
    private function collectDetails(): array
    {
        $plan = $this->option('plan');
        $planId = null;
        if ($plan !== null && $plan !== '') {
            $planId = Plan::query()->where('id', $plan)->orWhere('slug', $plan)->value('id');
            if (! $planId) {
                $this->warn("Plan \"{$plan}\" not found; falling back to the first active plan.");
            }
        }

        return [
            'company_name' => $this->option('company') ?: $this->ask('Company name'),
            'owner_name' => $this->option('owner-name') ?: $this->ask('Owner name'),
            'owner_email' => $this->option('owner-email') ?: $this->ask('Owner email'),
            'subdomain' => $this->option('subdomain') ?: $this->ask('Subdomain (e.g. acme)'),
            'plan_id' => $planId,
            'country' => $this->option('country') ?: null,
            'timezone' => $this->option('timezone') ?: 'UTC',
            'currency' => $this->option('currency') ?: 'USD',
        ];
    }
}
