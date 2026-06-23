<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Full demo dataset — config/master data PLUS heavy sample business records
 * (products, ~5,000 transactions, bulk accounting volume). This is what the old
 * DatabaseSeeder ran. It is NOT used by the installer (it takes minutes and
 * trips proxy timeouts); run it manually for a demo environment:
 *
 *   php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
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
            LanguageSeeder::class,
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
            AlertTypeSeeder::class,
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
            ChequeFormatConfigurationSeeder::class,
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
