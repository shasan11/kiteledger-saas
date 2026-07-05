<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Plan;
use App\Models\Central\WebsitePage;
use Inertia\Inertia;

class WebsiteController extends Controller
{
    public function home()
    {
        return $this->render('home');
    }

    public function pricing()
    {
        return Inertia::render('Central/Website/Page', ['page' => WebsitePage::with('sections')->where('page_type', 'pricing')->where('status', 'published')->first(), 'plans' => Plan::with('features')->where('is_active', true)->orderBy('sort_order')->get()]);
    }

    public function page(string $slug)
    {
        $page = WebsitePage::with('sections')->where('slug', $slug)->where('status', 'published')->firstOrFail();

        return Inertia::render('Central/Website/Page', ['page' => $page]);
    }

    private function render(string $type)
    {
        return Inertia::render('Central/Website/Page', ['page' => WebsitePage::with('sections')->where('page_type', $type)->where('status', 'published')->first()]);
    }
}
