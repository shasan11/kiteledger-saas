<?php

namespace App\Models\Central;

class WebsiteRedirect extends CentralModel
{
    protected function casts(): array
    {
        return ['last_hit_at' => 'datetime'];
    }
}
