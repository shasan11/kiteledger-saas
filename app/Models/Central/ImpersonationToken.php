<?php

namespace App\Models\Central;

class ImpersonationToken extends CentralModel
{
    protected $table = 'central_impersonation_tokens';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime'];
    }
}
