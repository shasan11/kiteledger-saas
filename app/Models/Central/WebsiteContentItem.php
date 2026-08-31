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

    protected static function booted(): void
    {
        static::saved(fn () => cache()->forget('website-content:v1'));
        static::deleted(fn () => cache()->forget('website-content:v1'));
    }

    public function media()
    {
        return $this->belongsTo(Media::class, 'media_id');
    }
}
