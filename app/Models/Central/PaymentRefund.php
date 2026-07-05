<?php

namespace App\Models\Central;

class PaymentRefund extends CentralModel
{
    protected function casts(): array
    {
        return ['response' => 'array'];
    }
}
