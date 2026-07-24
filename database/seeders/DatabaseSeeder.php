<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Production-safe installation data only. Heavy demo transactions must be
 * loaded explicitly with kiteledger:seed-demo and never through db:seed.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // The primary database is the SaaS control plane. A plain
        // `migrate:fresh --seed` must therefore produce an immediately usable
        // central installation. Tenant seeders run inside initialized tenant
        // contexts (and in the shared in-memory test schema only).
        $this->call(CentralDatabaseSeeder::class);

        if (! tenancy()->initialized && ! app()->environment('testing')) {
            return;
        }

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
            MasterProductDataSeeder::class,
            WalkInCustomerSeeder::class,
            FullPermissionUserSeeder::class,
            AiPermissionSeeder::class,
        ]);
    }
}
