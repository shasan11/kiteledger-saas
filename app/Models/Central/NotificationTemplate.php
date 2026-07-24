<?php

namespace App\Models\Central;

class NotificationTemplate extends CentralModel
{
    protected function casts(): array
    {
        return ['channels' => 'array', 'variables' => 'array', 'is_active' => 'boolean'];
    }
}
