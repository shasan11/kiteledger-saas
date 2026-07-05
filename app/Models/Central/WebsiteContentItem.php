<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class WebsiteContentItem extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['data' => 'array', 'published_at' => 'datetime'];
    }
}
