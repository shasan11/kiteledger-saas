<?php

namespace App\Models\Central;

class TenantFeatureOverride extends CentralModel
{
    protected $casts = ['enabled' => 'boolean', 'limit_value' => 'integer', 'expires_at' => 'datetime'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function feature()
    {
        return $this->belongsTo(Feature::class);
    }
}
