<?php

namespace App\Models\Central;

class SupportCategory extends CentralModel
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function defaultAssignee()
    {
        return $this->belongsTo(CentralAdmin::class, 'default_assignee_id');
    }

    public function tickets()
    {
        return $this->hasMany(SupportTicket::class, 'category_id');
    }
}
