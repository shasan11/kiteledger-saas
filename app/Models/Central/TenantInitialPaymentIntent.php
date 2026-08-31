<?php

namespace App\Models\Central;

class TenantInitialPaymentIntent extends CentralModel
{
    protected $hidden = ['proof_path'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'payment_date' => 'datetime', 'send_receipt' => 'boolean', 'adjustment_acknowledged' => 'boolean'];
    }
}
