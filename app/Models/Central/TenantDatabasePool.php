<?php

namespace App\Models\Central;

class TenantDatabasePool extends CentralModel
{
    protected $table = 'tenant_database_pool';

    protected $hidden = ['username', 'password'];

    protected function casts(): array
    {
        return ['username' => 'encrypted', 'password' => 'encrypted', 'validated_at' => 'datetime', 'allocated_at' => 'datetime', 'released_at' => 'datetime'];
    }
}
