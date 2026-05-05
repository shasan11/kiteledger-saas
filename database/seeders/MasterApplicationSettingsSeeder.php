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
            ['company_name' => 'Demo Company Pvt. Ltd.'],
            [
                'tag_line' => 'Smart ERP for Growing Businesses',
                'address' => 'Kathmandu, Nepal',
                'footer' => 'Thank you for your business.',
                'suggest_selling' => 'recent',
                'negative_cash_balance' => 'warn',
                'negative_item_balance' => 'warn',
                'credit_limit_exceed' => 'warn',
                'active' => true,
                'is_system_generated' => true,
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
