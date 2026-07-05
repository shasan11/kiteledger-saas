<?php

namespace App\Models\Central;

class PlanFeature extends CentralModel
{
    protected function casts(): array
    {
        return ['is_visible_on_pricing_page' => 'boolean'];
    }
}
