<?php

namespace App\Models\Central;

use App\Support\SafeHtml;
use Illuminate\Database\Eloquent\SoftDeletes;

class WebsitePage extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'content' => 'array', 'published_at' => 'datetime', 'scheduled_at' => 'datetime',
            'robots_index' => 'boolean', 'robots_follow' => 'boolean', 'schema_json' => 'array',
            'sitemap_include' => 'boolean',
        ];
    }

    public function sections()
    {
        return $this->hasMany(WebsiteSection::class, 'page_id')->orderBy('sort_order');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function featuredMedia()
    {
        return $this->belongsTo(Media::class, 'featured_media_id');
    }

    public function revisions()
    {
        return $this->hasMany(WebsiteRevision::class, 'revisionable_id')->where('revisionable_type', self::class)->latest('created_at');
    }

    public function setBodyAttribute(?string $value): void
    {
        $this->attributes['body'] = SafeHtml::clean($value);
    }

    protected static function booted(): void
    {
        static::saved(function (self $page): void {
            cache()->forget('website-page:'.$page->slug);
            cache()->forget('website-page:'.$page->page_type);
            cache()->forget('website-sitemap');
        });
        static::deleted(function (self $page): void {
            cache()->forget('website-page:'.$page->slug);
            cache()->forget('website-page:'.$page->page_type);
            cache()->forget('website-sitemap');
        });
    }
}
