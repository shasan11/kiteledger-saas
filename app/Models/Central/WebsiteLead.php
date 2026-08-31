<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class WebsiteLead extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['metadata' => 'array', 'contacted_at' => 'datetime'];
    }

    public function assignee()
    {
        return $this->belongsTo(CentralAdmin::class, 'assigned_to');
    }
}
