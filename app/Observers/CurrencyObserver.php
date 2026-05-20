<?php

namespace App\Observers;

use App\Models\Currency;

class CurrencyObserver
{
    public function saved(Currency $currency): void
    {
        if (!$currency->is_base) {
            return;
        }

        Currency::query()
            ->whereKeyNot($currency->getKey())
            ->where('is_base', true)
            ->update(['is_base' => false]);
    }
}
