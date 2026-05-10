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
            BranchSeeder::class,
            MasterCurrencySeeder::class,
            CurrencySeeder::class,
            FiscalYearSeeder::class,
            MasterApplicationSettingsSeeder::class,
            AppSettingSeeder::class,
            ApplicationSettingSeeder::class,
            GeneralSettingSeeder::class,
            MasterDocumentNumberingSeeder::class,
            DocumentNumberingSeeder::class,
            MasterChartOfAccountSeeder::class,
            MasterBankAccountSeeder::class,
            AccountingModuleSeeder::class,
            MasterContactDataSeeder::class,
            MasterProductDataSeeder::class,
            MasterHRMDataSeeder::class,
            MasterHRMAdditionalSeeder::class,
            HRMTransactionalSeeder::class,
            MasterDealDataSeeder::class,
            MasterDataTypesSeeder::class,
            MasterTaxJurisdictionSeeder::class,
            TaxRateSeeder::class,
            SettingsPermissionSeeder::class,
            PermissionSeeder::class,
            AdminAccessSeeder::class,
            ApprovalWorkflowSeeder::class,
            EmailConfigSeeder::class,
            EmailTemplateSeeder::class,
            PrintingTemplateSeeder::class,
            CustomTemplateSeeder::class,
            AccountingConfigurationSeeder::class,
            HrmConfigurationSeeder::class,
            InventorySeeder::class,
            InventoryConfigurationSeeder::class,
            SalesModuleSeeder::class,
            SalesConfigurationSeeder::class,
            PosSeeder::class,
            PurchaseModuleSeeder::class,
            PurchaseConfigurationSeeder::class,
            TransactionalRecordSeeder::class,
            RolesAndPermissionsSeeder::class,
        ]);
    }
}
