<?php

namespace App\Models\Central;

class Feature extends CentralModel
{
    protected $casts = ['is_active' => 'boolean', 'is_visible' => 'boolean', 'is_billable' => 'boolean', 'default_value' => 'json'];

    public function plans()
    {
        return $this->belongsToMany(Plan::class, 'plan_feature')->withPivot(['enabled', 'limit_value', 'value', 'inherit_default', 'display_on_pricing', 'pricing_label'])->withTimestamps();
    }

    protected static function booted(): void
    {
        static::saved(fn () => cache()->increment('feature-registry-version'));
        static::deleted(fn () => cache()->increment('feature-registry-version'));
    }
}
