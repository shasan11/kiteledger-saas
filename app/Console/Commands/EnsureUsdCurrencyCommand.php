<?php

namespace App\Console\Commands;

use App\Models\AppSetting;
use App\Models\Currency;
use Illuminate\Console\Command;

class EnsureUsdCurrencyCommand extends Command
{
    protected $signature = 'app:ensure-usd-currency';

    protected $description = 'Create USD currency and use it only when no base/default currency is configured.';

    public function handle(): int
    {
        $usd = Currency::query()->updateOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'US Dollar',
                'symbol' => '$',
                'decimal_places' => 2,
                'exchange_rate' => 1,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        if (! Currency::query()->where('is_base', true)->exists()) {
            $usd->forceFill(['is_base' => true, 'exchange_rate' => 1])->save();
            $this->info('USD set as base currency because no base currency existed.');
        }

        $setting = AppSetting::query()->oldest()->first();
        if ($setting && blank($setting->default_currency_id)) {
            $setting->forceFill(['default_currency_id' => $usd->id])->save();
            $this->info('USD set as default currency because no default currency existed.');
        }

        $this->info('USD currency is available.');

        return self::SUCCESS;
    }
}
