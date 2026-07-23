<?php

namespace App\Models\Central;

class Feature extends CentralModel
{
    protected $casts = ['is_active' => 'boolean'];

    public function plans()
    {
        return $this->belongsToMany(Plan::class, 'plan_feature')->withPivot(['enabled', 'limit_value'])->withTimestamps();
    }
}
