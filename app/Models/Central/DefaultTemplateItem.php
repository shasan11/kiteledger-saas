<?php

namespace App\Models\Central;

class DefaultTemplateItem extends CentralModel
{
    protected function casts(): array
    {
        return ['payload' => 'array', 'is_active' => 'boolean'];
    }
}
