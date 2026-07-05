<?php

namespace App\Models\Central;

class BackupManifest extends CentralModel
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return ['verified_at' => 'datetime', 'expires_at' => 'datetime'];
    }
}
