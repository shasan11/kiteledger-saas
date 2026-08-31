<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class Plan extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_featured' => 'boolean', 'data' => 'array', 'allow_pos' => 'boolean', 'allow_inventory' => 'boolean', 'allow_hrm' => 'boolean', 'allow_crm' => 'boolean', 'allow_warehouse' => 'boolean', 'allow_ai' => 'boolean', 'allow_custom_domain' => 'boolean', 'allow_multi_branch' => 'boolean', 'allow_api_access' => 'boolean'];
    }

    public function features()
    {
        return $this->hasMany(PlanFeature::class);
    }

    public function plansFeatureRegistry()
    {
        return $this->belongsToMany(Feature::class, 'plan_feature')
            ->withPivot(['enabled', 'limit_value', 'value', 'inherit_default', 'display_on_pricing', 'pricing_label'])
            ->withTimestamps();
    }
}
