<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogCategory;
use App\Models\Central\BlogPost;
use App\Models\Central\BlogTag;
use App\Models\Central\Plan;
use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsiteMenu;
use App\Models\Central\WebsitePage;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class WebsiteController extends Controller
{
    public function home()
    {
        return $this->render('home');
    }

    public function pricing()
    {
        return $this->publicRender('pricing', ['plans' => Plan::with('features')->where('is_active', true)->orderBy('sort_order')->get()]);
    }

    public function page(string $slug)
    {
        return $this->publicRender($slug);
    }

    public function blog(Request $request, ?string $category = null, ?string $tag = null)
    {
        $query = BlogPost::with(['categories', 'tags', 'featuredMedia'])->where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now());
        if ($category) {
            $query->whereHas('categories', fn ($q) => $q->where('slug', $category));
        }
        if ($tag) {
            $query->whereHas('tags', fn ($q) => $q->where('slug', $tag));
        }

        return Inertia::render('Central/Website/Blog', $this->sharedPublic() + ['posts' => $query->latest('published_at')->paginate(12)->withQueryString(), 'featured' => BlogPost::with('featuredMedia')->where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->where('is_featured', true)->latest('published_at')->limit(3)->get(), 'recent' => BlogPost::where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->latest('published_at')->limit(6)->get(['id', 'title', 'slug', 'published_at']), 'archive' => ['category' => $category ? BlogCategory::where('slug', $category)->where('status', 'active')->firstOrFail() : null, 'tag' => $tag ? BlogTag::where('slug', $tag)->where('status', 'active')->firstOrFail() : null]]);
    }

    public function category(Request $request, string $category)
    {
        return $this->blog($request, $category);
    }

    public function tag(Request $request, string $tag)
    {
        return $this->blog($request, null, $tag);
    }

    public function post(string $slug)
    {
        $post = BlogPost::with(['categories', 'tags', 'featuredMedia'])->where('slug', $slug)->where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->firstOrFail();
        if (blank($post->canonical_url)) {
            $post->canonical_url = rtrim((string) app(PlatformSettingsService::class)->get('seo.canonical_base_url', config('app.url')), '/').'/blog/'.$post->slug;
        }
        $related = BlogPost::where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->whereKeyNot($post->id)->whereHas('categories', fn ($q) => $q->whereIn('blog_categories.id', $post->categories->pluck('id')))->latest('published_at')->limit(3)->get();

        return Inertia::render('Central/Website/Post', $this->sharedPublic() + ['post' => $post, 'related' => $related]);
    }

    public function sitemap(PlatformSettingsService $settings)
    {
        abort_unless($settings->get('seo.sitemap_enabled', true), 404);
        $base = rtrim((string) $settings->get('seo.canonical_base_url', config('app.url')), '/');
        $xml = Cache::remember('website-sitemap', now()->addMinutes((int) $settings->get('seo.sitemap_cache_duration', 60)), function () use ($settings, $base): string {
            $urls = collect();
            if ($settings->get('seo.include_pages', true)) {
                $urls = $urls->merge(WebsitePage::where('status', 'published')->where('visibility', 'public')->where('sitemap_include', true)->where(fn ($query) => $query->whereNull('published_at')->orWhere('published_at', '<=', now()))->get()->map(fn ($page) => [$base.($page->slug === 'home' ? '/' : '/'.$page->slug), $page->updated_at, $page->sitemap_priority, $page->sitemap_change_frequency]));
            }
            if ($settings->get('seo.include_posts', true)) {
                $urls = $urls->merge(BlogPost::where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->where('sitemap_include', true)->get()->map(fn ($post) => [$base.'/blog/'.$post->slug, $post->updated_at, $post->sitemap_priority, 'monthly']));
            }
            if ($settings->get('seo.include_categories', true)) {
                $urls = $urls->merge(BlogCategory::where('status', 'active')->get()->map(fn ($category) => [$base.'/blog/category/'.$category->slug, $category->updated_at, 0.5, 'weekly']));
            }
            if ($settings->get('seo.include_tags', true)) {
                $urls = $urls->merge(BlogTag::where('status', 'active')->get()->map(fn ($tag) => [$base.'/blog/tag/'.$tag->slug, $tag->updated_at, 0.4, 'weekly']));
            }

            return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.$urls->map(fn ($url) => '<url><loc>'.e($url[0]).'</loc><lastmod>'.$url[1]->toAtomString().'</lastmod><changefreq>'.$url[3].'</changefreq><priority>'.$url[2].'</priority></url>')->implode('').'</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function robots(PlatformSettingsService $settings)
    {
        $content = $settings->get('seo.robots.txt_editor', "User-agent: *\nAllow: /");
        if (is_array($content)) {
            $content = implode("\n", $content);
        }

        return response((string) $content, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    private function render(string $type)
    {
        return $this->publicRender($type);
    }

    private function publicRender(string $slugOrType, array $extra = [])
    {
        $page = Cache::remember('website-page:v2:'.$slugOrType, now()->addMinutes(30), function () use ($slugOrType): array {
            $page = WebsitePage::with(['sections' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
                ->where('status', 'published')
                ->where('visibility', 'public')
                ->where(fn ($query) => $query->whereNull('published_at')->orWhere('published_at', '<=', now()))
                ->where(fn ($query) => $query->where('slug', $slugOrType)->orWhere('page_type', $slugOrType))
                ->firstOrFail();
            if (blank($page->canonical_url)) {
                $base = rtrim((string) app(PlatformSettingsService::class)->get('seo.canonical_base_url', config('app.url')), '/');
                $page->setAttribute('canonical_url', $base.($page->slug === 'home' ? '/' : '/'.$page->slug));
            }

            return $page->toArray();
        });

        $content = Cache::remember('website-content:v1', now()->addMinutes(30), fn (): array => WebsiteContentItem::query()
            ->where('status', 'published')
            ->where(fn ($query) => $query->whereNull('published_at')->orWhere('published_at', '<=', now()))
            ->orderBy('sort_order')
            ->get()
            ->groupBy('type')
            ->map(fn ($items) => $items->values()->toArray())
            ->all());
        $publicPlans = in_array($page['page_type'], ['home', 'pricing'], true)
            ? Plan::with('features')->where('is_active', true)->orderBy('sort_order')->get()
            : collect();

        return Inertia::render('Central/Website/Page', $this->sharedPublic() + [
            'page' => $page,
            'content' => $content,
            'faqs' => in_array($page['page_type'], ['home', 'support'], true) ? ($content['faq'] ?? []) : [],
            'testimonials' => $page['page_type'] === 'home' ? ($content['testimonial'] ?? []) : [],
            'announcements' => collect($content['announcement'] ?? [])->filter(function (array $item): bool {
                $data = $item['data'] ?? [];
                $started = blank($data['starts_at'] ?? null) || now()->gte($data['starts_at']);
                $notEnded = blank($data['ends_at'] ?? null) || now()->lte($data['ends_at']);

                return $started && $notEnded;
            })->values()->all(),
            'plans' => $publicPlans,
        ] + $extra);
    }

    private function sharedPublic(): array
    {
        $menus = Cache::remember('website-menus:v2', now()->addMinutes(30), fn (): array => WebsiteMenu::with(['page:id,title,slug', 'children' => fn ($query) => $query->with('page:id,title,slug')->where('is_active', true)->orderBy('sort_order')])
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->groupBy('location')
            ->map(fn ($items) => $items->values()->toArray())
            ->all());

        return ['menus' => $menus, 'site' => app(PlatformSettingsService::class)->publicSettings()];
    }
}
