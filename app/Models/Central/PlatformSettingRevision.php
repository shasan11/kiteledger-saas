<?php

namespace App\Models\Central;

class PlatformSettingRevision extends CentralModel
{
    public $timestamps = false;

    protected $hidden = ['old_value', 'new_value'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
