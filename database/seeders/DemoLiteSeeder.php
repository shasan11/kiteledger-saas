<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DemoLiteSeeder extends Seeder
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
            MasterProductDataSeeder::class,
            WalkInCustomerSeeder::class,
            FullPermissionUserSeeder::class,
            ProductSeeder::class,
        ]);
    }
}
