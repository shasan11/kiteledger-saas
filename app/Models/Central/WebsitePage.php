<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class WebsitePage extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['content' => 'array', 'published_at' => 'datetime'];
    }

    public function sections()
    {
        return $this->hasMany(WebsiteSection::class, 'page_id')->orderBy('sort_order');
    }
}
