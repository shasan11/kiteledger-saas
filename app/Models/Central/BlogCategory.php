<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class BlogCategory extends CentralModel
{
    use SoftDeletes;

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function posts()
    {
        return $this->belongsToMany(BlogPost::class, 'blog_post_category');
    }

    protected static function booted(): void
    {
        static::saved(fn () => cache()->forget('website-sitemap'));
        static::deleted(fn () => cache()->forget('website-sitemap'));
    }
}
