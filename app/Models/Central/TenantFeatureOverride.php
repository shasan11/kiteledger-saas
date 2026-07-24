<?php

namespace App\Models\Central;

class TenantFeatureOverride extends CentralModel
{
    protected $casts = ['enabled' => 'boolean', 'limit_value' => 'integer', 'value' => 'json', 'starts_at' => 'datetime', 'expires_at' => 'datetime'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function feature()
    {
        return $this->belongsTo(Feature::class);
    }

    protected static function booted(): void
    {
        static::saved(fn () => cache()->increment('feature-registry-version'));
        static::deleted(fn () => cache()->increment('feature-registry-version'));
    }
}
