<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Seeder;
use Symfony\Component\Intl\Currencies;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $userId = User::query()
            ->where('email', 'main.branch@kiteledger.local')
            ->value('id');

        foreach (Currencies::getNames() as $code => $name) {
            Currency::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'symbol' => Currencies::getSymbol($code),
                    'decimal_places' => Currencies::getFractionDigits($code),
                    'is_base' => $code === 'USD',
                    'active' => true,
                    'user_add_id' => $userId,
                ]
            );
        }
    }
}
