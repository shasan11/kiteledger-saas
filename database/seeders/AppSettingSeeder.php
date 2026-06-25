<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\Currency;
use App\Models\FiscalYear;
use Illuminate\Database\Seeder;

class AppSettingSeeder extends Seeder
{
    public function run(): void
    {
        // Public-disk paths. Put the files under storage/app/public/... and run
        // php artisan storage:link so they are served from /storage/...
        $lightLogoPath = 'company/logos/light_logo.png';
        $darkLogoPath = 'company/logos/dark_logo.png';
        $faviconPath = 'company/favicons/favicon.png';

        AppSetting::query()->updateOrCreate(
            ['company_name' => 'KiteLedger Pvt. Ltd.'],
            [
                'legal_name' => 'KiteLedger Private Limited',
                'registration_number' => 'REG-2083-001',
                'tax_number' => 'PAN-600001111',
                'vat_number' => 'VAT-600001111',

                'tag_line' => 'Integrated accounting and operations',
                'address' => 'Kamaladi, Kathmandu, Nepal',
                'phone' => '+977-01-5970000',
                'email' => 'info@kiteledger.local',
                'website' => 'https://kiteledger.local',

                'address_line_1' => 'Kamaladi',
                'address_line_2' => null,
                'city' => 'Kathmandu',
                'state' => 'Bagmati',
                'postal_code' => '44600',
                'country' => 'Nepal',

                'default_currency_id' => Currency::query()->where('code', 'USD')->value('id'),
                'fiscal_year_id' => FiscalYear::query()->where('is_current', true)->value('id'),

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
                'brand_sidebar_color' => '#ffffff',
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
    }
}
