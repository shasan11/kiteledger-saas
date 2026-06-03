<?php

namespace Database\Seeders;

use App\Models\SmsConfig;
use Illuminate\Database\Seeder;

class SmsConfigSeeder extends Seeder
{
    public function run(): void
    {
        $config = SmsConfig::query()->firstOrCreate(
            ['provider' => SmsConfig::PROVIDER_TWILIO],
            [
                'name' => 'Twilio',
                'sender_id' => 'Twilio',
                'test_message' => 'KiteLedger SMS test message.',
                'active' => true,
                'is_active' => true,
                'is_default' => true,
                'is_system_generated' => true,
            ]
        );

        $config->forceFill([
            'name' => 'Twilio',
            'provider' => SmsConfig::PROVIDER_TWILIO,
            'is_default' => true,
            'active' => true,
            'is_active' => true,
        ])->save();

        SmsConfig::query()
            ->where('id', '!=', $config->id)
            ->update(['is_default' => false]);
    }
}
