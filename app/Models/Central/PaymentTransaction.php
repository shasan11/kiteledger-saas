<?php

namespace App\Models\Central;

class PaymentTransaction extends CentralModel
{
    protected function casts(): array
    {
        return ['raw_response' => 'array', 'paid_at' => 'datetime'];
    }
}
