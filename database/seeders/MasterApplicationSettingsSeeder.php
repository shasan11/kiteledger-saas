<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\ApplicationSetting;
use App\Models\GeneralSetting;
use Illuminate\Database\Seeder;

class MasterApplicationSettingsSeeder extends Seeder
{
    public function run(): void
    {
        AppSetting::updateOrCreate(
            ['key' => 'company_name'],
            [
                'value' => 'Demo Company Pvt. Ltd.',
                'group' => 'company',
                'label' => 'Company Name',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'tag_line'],
            [
                'value' => 'Smart ERP for Growing Businesses',
                'group' => 'company',
                'label' => 'Tag Line',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'address'],
            [
                'value' => 'Kathmandu, Nepal',
                'group' => 'company',
                'label' => 'Address',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'footer'],
            [
                'value' => 'Thank you for your business.',
                'group' => 'company',
                'label' => 'Footer Text',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'suggest_selling'],
            [
                'value' => 'recent',
                'group' => 'sales',
                'label' => 'Suggest Selling',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'negative_cash_balance'],
            [
                'value' => 'warn',
                'group' => 'warnings',
                'label' => 'Negative Cash Balance',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'negative_item_balance'],
            [
                'value' => 'warn',
                'group' => 'warnings',
                'label' => 'Negative Item Balance',
            ]
        );

        AppSetting::updateOrCreate(
            ['key' => 'credit_limit_exceed'],
            [
                'value' => 'warn',
                'group' => 'warnings',
                'label' => 'Credit Limit Exceed',
            ]
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'default_currency'],
            ['value' => 'NPR']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'default_branch_code'],
            ['value' => 'HO']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'fiscal_year_start_month'],
            ['value' => '4']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'date_format'],
            ['value' => 'Y-m-d']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'timezone'],
            ['value' => 'Asia/Kathmandu']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'allow_auto_journal'],
            ['value' => '1']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'allow_auto_account_creation'],
            ['value' => '1']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'default_tax_country'],
            ['value' => 'NP']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'approval_required_for_financial_transactions'],
            ['value' => '1']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'official_number_only_after_approval'],
            ['value' => '1']
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'journal_voucher_only_after_approval'],
            ['value' => '1']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'company_country'],
            ['value' => 'NP']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'company_timezone'],
            ['value' => 'Asia/Kathmandu']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'default_decimal_places'],
            ['value' => '2']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'stock_negative_balance'],
            ['value' => 'warn']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'cash_negative_balance'],
            ['value' => 'warn']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'credit_limit_exceed'],
            ['value' => 'warn']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'enable_tax'],
            ['value' => '1']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'enable_inventory'],
            ['value' => '1']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'enable_crm'],
            ['value' => '1']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'enable_hrm'],
            ['value' => '1']
        );

        GeneralSetting::updateOrCreate(
            ['key' => 'enable_project'],
            ['value' => '1']
        );
    }
}
