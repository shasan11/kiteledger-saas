<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CentralNotification extends CentralModel
{
    use HasUuids;

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime', 'dismissed_at' => 'datetime', 'expires_at' => 'datetime'];
    }
}
