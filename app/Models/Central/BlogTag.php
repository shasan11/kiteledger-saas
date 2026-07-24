<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class BlogTag extends CentralModel
{
    use SoftDeletes;

    public function posts()
    {
        return $this->belongsToMany(BlogPost::class, 'blog_post_tag');
    }

    protected static function booted(): void
    {
        static::saved(fn () => cache()->forget('website-sitemap'));
        static::deleted(fn () => cache()->forget('website-sitemap'));
    }
}
