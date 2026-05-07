<?php

namespace Database\Seeders;

use App\Models\ApplicationSetting;
use Illuminate\Database\Seeder;

class ApplicationSettingSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['key' => 'app.timezone', 'value' => 'Asia/Katmandu', 'group' => 'localization'],
            ['key' => 'app.date_format', 'value' => 'DD-MM-YYYY', 'group' => 'localization'],
            ['key' => 'app.week_start_day', 'value' => 'Sunday', 'group' => 'localization'],
            ['key' => 'finance.default_tax_country', 'value' => 'NP', 'group' => 'finance'],
            ['key' => 'inventory.product_code_prefix', 'value' => 'PROD', 'group' => 'inventory'],
        ] as $setting) {
            ApplicationSetting::query()->updateOrCreate(
                ['key' => $setting['key']],
                $setting + ['active' => true, 'is_system_generated' => true, 'user_add_id' => null]
            );
        }
    }
}
