<?php

namespace App\Models\Central;

class WebsiteMenu extends CentralModel
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
