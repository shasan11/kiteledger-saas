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
            MasterHRMDataSeeder::class,
            MasterHRMAdditionalSeeder::class,
            HRMTransactionalSeeder::class,
            MasterDealDataSeeder::class,
            MasterDataTypesSeeder::class,
            TaxSystemSeeder::class,
            MasterTaxJurisdictionSeeder::class,
            MasterProductDataSeeder::class,
            ProductSeeder::class,
            TaxRateSeeder::class,
            TaxReportTemplateSeeder::class,
            SettingsPermissionSeeder::class,
            PermissionSeeder::class,
            AdminAccessSeeder::class,
            ApprovalWorkflowSeeder::class,
            EmailConfigSeeder::class,
            EmailTemplateSeeder::class,
            PrintingTemplateSeeder::class,
            SmsConfigSeeder::class,
            CustomTemplateSeeder::class,
            AccountingConfigurationSeeder::class,
            HrmConfigurationSeeder::class,
            InventoryConfigurationSeeder::class,
            SalesConfigurationSeeder::class,
            PosSeeder::class,
            RolesAndPermissionsSeeder::class,
            FullPermissionUserSeeder::class,
            TransactionalRecordSeeder::class,
            AccountingTransactionVolumeSeeder::class,
            AiPermissionSeeder::class,
         ]);
    }
}
