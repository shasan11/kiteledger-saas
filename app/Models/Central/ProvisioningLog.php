<?php

namespace App\Models\Central;

class ProvisioningLog extends CentralModel
{
    protected $table = 'tenant_provisioning_logs';

    protected function casts(): array
    {
        return ['context' => 'array', 'started_at' => 'datetime', 'finished_at' => 'datetime'];
    }
}
