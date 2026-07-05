<?php

namespace App\Models\Central;

class PaymentGateway extends CentralModel
{
    protected $hidden = ['secret_key', 'webhook_secret'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'secret_key' => 'encrypted', 'webhook_secret' => 'encrypted', 'supported_currencies' => 'array', 'config' => 'encrypted:array'];
    }
}
