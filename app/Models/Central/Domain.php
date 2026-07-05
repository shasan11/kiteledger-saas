<?php

namespace App\Models\Central;

use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

class Domain extends BaseDomain
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean', 'verified_at' => 'datetime', 'verification_attempted_at' => 'datetime', 'activated_at' => 'datetime', 'disabled_at' => 'datetime', 'verification_token' => 'encrypted', 'metadata' => 'array'];
    }
}
