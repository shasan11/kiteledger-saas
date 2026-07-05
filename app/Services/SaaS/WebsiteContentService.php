<?php

namespace App\Services\SaaS;

use App\Models\Central\WebsitePage;

class WebsiteContentService
{
    public function publishedPage(string $slugOrType): ?WebsitePage
    {
        return WebsitePage::with(['sections' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')])
            ->where('status', 'published')
            ->where(fn ($query) => $query->where('slug', $slugOrType)->orWhere('page_type', $slugOrType))
            ->first();
    }
}
