<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class DefaultDataTemplate extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['is_default' => 'boolean', 'is_active' => 'boolean', 'data' => 'array'];
    }

    public function items()
    {
        return $this->hasMany(DefaultTemplateItem::class, 'template_id')->orderBy('sort_order');
    }
}
