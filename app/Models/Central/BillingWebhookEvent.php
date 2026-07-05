<?php

namespace App\Models\Central;

class BillingWebhookEvent extends CentralModel
{
    protected $table = 'tenant_payment_webhook_logs';

    protected function casts(): array
    {
        return ['payload' => 'array', 'processed_at' => 'datetime'];
    }
}
