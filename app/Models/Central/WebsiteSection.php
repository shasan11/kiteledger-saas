<?php

namespace App\Models\Central;

class WebsiteSection extends CentralModel
{
    protected function casts(): array
    {
        return ['settings' => 'array', 'is_active' => 'boolean'];
    }
}
