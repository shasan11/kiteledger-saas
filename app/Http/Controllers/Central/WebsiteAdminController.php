<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogPost;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsiteSection;
use Inertia\Inertia;

class WebsiteAdminController extends Controller
{
    public function __invoke()
    {
        return Inertia::render('Central/Website/Overview', ['metrics' => [
            'published_pages' => WebsitePage::where('status', 'published')->count(), 'draft_pages' => WebsitePage::where('status', 'draft')->count(),
            'published_posts' => BlogPost::where('status', 'published')->count(), 'draft_posts' => BlogPost::whereIn('status', ['draft', 'review'])->count(),
            'missing_seo' => WebsitePage::where(fn ($q) => $q->whereNull('meta_title')->orWhereNull('meta_description'))->count(),
            'active_sections' => WebsiteSection::where('is_active', true)->count(),
        ], 'recent' => WebsitePage::latest('updated_at')->limit(8)->get(['id', 'title', 'slug', 'status', 'updated_at'])]);
    }
}
