<?php

namespace App\Models\Central;

use App\Support\SafeHtml;

class WebsiteSection extends CentralModel
{
    protected function casts(): array
    {
        return ['settings' => 'array', 'items' => 'array', 'is_active' => 'boolean'];
    }

    public function setContentAttribute(?string $value): void
    {
        $this->attributes['content'] = SafeHtml::clean($value);
    }

    protected static function booted(): void
    {
        static::saved(fn (self $section) => self::forgetPageCache($section));
        static::deleted(fn (self $section) => self::forgetPageCache($section));
    }

    public function page()
    {
        return $this->belongsTo(WebsitePage::class, 'page_id');
    }

    public function media()
    {
        return $this->belongsTo(Media::class, 'media_id');
    }

    private static function forgetPageCache(self $section): void
    {
        $page = $section->page;
        if (! $page) {
            return;
        }
        foreach ([$page->slug, $page->page_type] as $key) {
            cache()->forget('website-page:'.$key);
            cache()->forget('website-page:v2:'.$key);
        }
    }
}
