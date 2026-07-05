<?php

namespace App\Models\Central;

class TenantUsageMetric extends CentralModel
{
    protected function casts(): array
    {
        return ['period_start' => 'date', 'period_end' => 'date', 'data' => 'array'];
    }
}
