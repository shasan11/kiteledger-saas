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

    public function scopePubliclyVisible($query)
    {
        return $query->where('is_active', true)->where(function ($menu): void {
            $menu->whereNull('page_id')->orWhereHas('page', function ($page): void {
                $page->where('status', 'published')
                    ->where('visibility', 'public')
                    ->where(fn ($window) => $window->whereNull('published_at')->orWhere('published_at', '<=', now()));
            });
        });
    }

    protected static function booted(): void
    {
        static::saved(function (): void {
            cache()->forget('website-menus');
            cache()->forget('website-menus:v2');
        });
        static::deleted(function (): void {
            cache()->forget('website-menus');
            cache()->forget('website-menus:v2');
        });
    }
}
