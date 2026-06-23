<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Minimal install seed.
 *
 * Froiden's web installer runs `php artisan db:seed`, so this list must stay
 * small for shared hosting/cPanel installs. It does not seed optional module
 * lookup tables, print templates, HRM/tax/product setup, or demo records.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
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
            FullPermissionUserSeeder::class,
        ]);
    }
}
