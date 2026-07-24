<?php

namespace App\Models\Central;

class WebsiteRevision extends CentralModel
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'created_at' => 'datetime'];
    }
}
