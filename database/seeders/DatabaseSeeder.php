<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            MainBranchSeeder::class,
            MasterCurrencySeeder::class,
            MasterApplicationSettingsSeeder::class,
            MasterDocumentNumberingSeeder::class,
            MasterChartOfAccountSeeder::class,
            MasterBankAccountSeeder::class,
            AccountingModuleSeeder::class,
            MasterContactDataSeeder::class,
            MasterProductDataSeeder::class,
            MasterHRMDataSeeder::class,
            MasterHRMAdditionalSeeder::class,
            MasterDealDataSeeder::class,
            MasterDataTypesSeeder::class,
            MasterTaxJurisdictionSeeder::class,
            InventorySeeder::class,
            SalesModuleSeeder::class,
            PurchaseModuleSeeder::class,
            TransactionalRecordSeeder::class,
        ]);
    }
}
