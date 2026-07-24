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
        static::saved(fn (self $section) => cache()->forget('website-page:'.$section->page?->slug));
        static::deleted(fn (self $section) => cache()->forget('website-page:'.$section->page?->slug));
    }

    public function page()
    {
        return $this->belongsTo(WebsitePage::class, 'page_id');
    }
}
