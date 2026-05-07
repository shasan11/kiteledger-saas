<?php

namespace Database\Seeders;

use App\Models\GeneralSetting;
use Illuminate\Database\Seeder;

class GeneralSettingSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['key' => 'ui.default_page_size', 'value' => '20', 'group' => 'ui'],
            ['key' => 'documents.default_padding', 'value' => '6', 'group' => 'documents'],
            ['key' => 'notifications.email_enabled', 'value' => 'true', 'group' => 'notifications'],
        ] as $setting) {
            GeneralSetting::query()->updateOrCreate(
                ['key' => $setting['key']],
                $setting + ['active' => true, 'is_system_generated' => true, 'user_add_id' => null]
            );
        }
    }
}
