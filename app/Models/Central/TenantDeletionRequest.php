<?php

namespace App\Models\Central;

class TenantDeletionRequest extends CentralModel
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return ['execute_after' => 'datetime', 'backup_waived' => 'boolean'];
    }
}
