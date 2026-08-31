<?php

namespace App\Models\Central;

use App\Support\SafeHtml;
use Illuminate\Database\Eloquent\SoftDeletes;

class BlogPost extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime', 'scheduled_at' => 'datetime', 'is_featured' => 'boolean',
            'robots_index' => 'boolean', 'robots_follow' => 'boolean', 'article_schema' => 'array',
            'sitemap_include' => 'boolean',
        ];
    }

    public function setContentAttribute(?string $value): void
    {
        $this->attributes['content'] = SafeHtml::clean($value);
        $words = str_word_count(strip_tags((string) $this->attributes['content']));
        $this->attributes['reading_time'] = max(1, (int) ceil($words / 220));
    }

    public function categories()
    {
        return $this->belongsToMany(BlogCategory::class, 'blog_post_category');
    }

    public function tags()
    {
        return $this->belongsToMany(BlogTag::class, 'blog_post_tag');
    }

    public function featuredMedia()
    {
        return $this->belongsTo(Media::class, 'featured_media_id');
    }

    public function author()
    {
        return $this->belongsTo(CentralAdmin::class, 'created_by');
    }

    public function revisions()
    {
        return $this->hasMany(WebsiteRevision::class, 'revisionable_id')->where('revisionable_type', self::class)->latest('created_at');
    }

    protected static function booted(): void
    {
        static::saved(fn () => cache()->forget('website-sitemap'));
        static::deleted(fn () => cache()->forget('website-sitemap'));
    }
}
