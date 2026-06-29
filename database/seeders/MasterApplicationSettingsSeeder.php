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
        // Null values intentionally use the shipped public/branding fallbacks.
        $lightLogoPath = null;
        $darkLogoPath = null;
        $faviconPath = null;

        AppSetting::updateOrCreate(
            ['company_name' => 'Demo Company Pvt. Ltd.'],
            [
                'legal_name' => 'Demo Company Private Limited',
                'registration_number' => null,
                'tax_number' => null,
                'vat_number' => null,

                'tag_line' => 'Smart ERP for Growing Businesses',
                'address' => 'Kathmandu, Nepal',
                'phone' => null,
                'email' => null,
                'website' => null,

                'address_line_1' => 'Kathmandu',
                'address_line_2' => null,
                'city' => 'Kathmandu',
                'state' => 'Bagmati',
                'postal_code' => null,
                'country' => 'Nepal',

                'timezone' => 'Asia/Kathmandu',
                'date_format' => 'DD-MM-YYYY',
                'time_format' => 'HH:mm',
                'number_format' => '1,23,456.78',
                'language' => 'en',
                'week_start_day' => 'Sunday',
                'financial_year_start_month' => 4,
                'use_nepali_calendar' => false,

                'footer' => 'Thank you for your business.',

                'logo' => $lightLogoPath,
                'dark_logo' => $darkLogoPath,
                'favicon' => $faviconPath,

                'brand_primary_color' => '#10b981',
                'brand_secondary_color' => '#10233f',
                'brand_accent_color' => '#f97316',
                'brand_sidebar_color' => '#0b1220',
                'brand_header_color' => '#ffffff',
                'brand_text_color' => '#111827',

                'suggest_selling' => 'recent',
                'negative_cash_balance' => 'warn',
                'negative_item_balance' => 'warn',
                'credit_limit_exceed' => 'warn',

                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
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

        ApplicationSetting::updateOrCreate(
            ['key' => 'company_light_logo'],
            ['value' => $lightLogoPath]
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'company_dark_logo'],
            ['value' => $darkLogoPath]
        );

        ApplicationSetting::updateOrCreate(
            ['key' => 'company_favicon'],
            ['value' => $faviconPath]
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
