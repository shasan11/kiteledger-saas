<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Used by the web installer for real customer deployments.
 *
 * Mirrors DatabaseSeeder's call list but excludes seeders that create
 * demo/sample business records or backdoor user accounts with hardcoded
 * passwords (MainBranchSeeder, ProductSeeder, FullPermissionUserSeeder,
 * TransactionalRecordSeeder, AccountingTransactionVolumeSeeder). Only
 * structural/configuration/lookup data is loaded; the installer's own
 * createSuperAdmin() is the only login created.
 */
class ProductionSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
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
            AiPermissionSeeder::class,
        ]);
    }
}
