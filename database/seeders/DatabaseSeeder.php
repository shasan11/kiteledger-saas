<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Default install seed — runs on `php artisan db:seed` and via the Froiden web
 * installer.
 *
 * TWO MODES:
 *
 *  1. NORMAL (default) — a lightweight master/setup seed only. It must stay fast
 *     and small for CodeCanyon / shared-hosting installs (no proxy timeouts). It
 *     seeds required configuration plus essential setup data (product units,
 *     Walk-in Customer) but creates NO sample business transactions.
 *
 *  2. DEMO — when demo mode is enabled (config('app.demo'), i.e. APP_DEMO=true or
 *     DEMO_MODE=true in .env) this delegates to {@see DemoSeeder}, which loads
 *     the FULL realistic dataset (products, customers/suppliers, invoices, bills,
 *     payments, POS, accounting volume, AI permissions, etc.). Demo data is heavy
 *     and intended for demo environments — do NOT enable it for a normal install.
 *
 * Heavy demo data is never merged into the normal path below.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // ---- DEMO MODE -----------------------------------------------------
        // Enabled => load the rich demo dataset and stop. Disabled/missing =>
        // fall through to the minimal seed. Checked via config (cache-safe) with
        // an env fallback so it works even before config:cache.
        if ($this->demoModeEnabled()) {
            $this->command?->warn('Demo mode enabled — seeding the FULL demo dataset (this can take a while).');
            $this->call(DemoSeeder::class);

            return;
        }

        // ---- NORMAL (lightweight) SEED -------------------------------------
        // Required configuration / master data only. Kept deliberately small.
        $this->call([
            BranchSeeder::class,
            MasterCurrencySeeder::class,
            FiscalYearSeeder::class,
            MasterApplicationSettingsSeeder::class,
            AppSettingSeeder::class,
            LanguageSeeder::class,
            ApplicationSettingSeeder::class,
            GeneralSettingSeeder::class,
            MasterDocumentNumberingSeeder::class,
            DocumentNumberingSeeder::class,
            MasterChartOfAccountSeeder::class,
            AccountingConfigurationSeeder::class,
            // Essential setup data (idempotent, lightweight — NOT demo records):
            MasterProductDataSeeder::class, // product units + categories
            WalkInCustomerSeeder::class,    // default POS / counter-sale customer
            FullPermissionUserSeeder::class,
        ]);
    }

    /**
     * Whether the installer should load the full demo dataset instead of the
     * minimal seed. True when APP_DEMO / DEMO_MODE resolves truthy.
     */
    public function demoModeEnabled(): bool
    {
        if (filter_var(config('app.demo', false), FILTER_VALIDATE_BOOLEAN)) {
            return true;
        }

        // Env fallback covers the case where config('app.demo') isn't wired yet.
        return filter_var(env('APP_DEMO', env('DEMO_MODE', false)), FILTER_VALIDATE_BOOLEAN);
    }
}
