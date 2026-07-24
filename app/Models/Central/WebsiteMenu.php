<?php

namespace App\Models\Central;

class WebsiteMenu extends CentralModel
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function page()
    {
        return $this->belongsTo(WebsitePage::class);
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    protected static function booted(): void
    {
        static::saved(fn () => cache()->forget('website-menus'));
        static::deleted(fn () => cache()->forget('website-menus'));
    }
}
