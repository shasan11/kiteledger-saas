<?php

namespace App\Models\Central;

class CentralAuditLog extends CentralModel
{
    public $timestamps = false;

    protected $table = 'central_audit_logs';

    protected function casts(): array
    {
        return ['old_values' => 'array', 'new_values' => 'array', 'created_at' => 'datetime'];
    }
}
