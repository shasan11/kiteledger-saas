<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Media extends CentralModel
{
    use SoftDeletes;

    protected $table = 'central_media';

    protected $appends = ['url'];

    protected $hidden = ['path', 'disk'];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    protected static function booted(): void
    {
        $forget = function (self $media): void {
            $media->websiteSections()->with('page:id,slug,page_type')->get()->each(function (WebsiteSection $section): void {
                foreach (array_filter([$section->page?->slug, $section->page?->page_type]) as $key) {
                    cache()->forget('website-page:'.$key);
                    cache()->forget('website-page:v2:'.$key);
                }
            });
            WebsitePage::query()->get(['slug', 'page_type'])->each(function (WebsitePage $page): void {
                foreach (array_filter([$page->slug, $page->page_type]) as $key) {
                    cache()->forget('website-page:'.$key);
                    cache()->forget('website-page:v2:'.$key);
                }
            });
            cache()->forget('website-content:v1');
        };
        static::saved($forget);
        static::deleted($forget);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function blogPosts()
    {
        return $this->hasMany(BlogPost::class, 'featured_media_id');
    }

    public function websitePages()
    {
        return $this->hasMany(WebsitePage::class, 'featured_media_id');
    }

    public function websiteSections()
    {
        return $this->hasMany(WebsiteSection::class, 'media_id');
    }

    public function websiteContentItems()
    {
        return $this->hasMany(WebsiteContentItem::class, 'media_id');
    }
}
