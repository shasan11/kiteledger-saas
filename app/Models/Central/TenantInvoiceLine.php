<?php

namespace App\Models\Central;

class TenantInvoiceLine extends CentralModel
{
    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}
