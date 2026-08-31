<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogCategory;
use App\Models\Central\BlogPost;
use App\Models\Central\BlogTag;
use App\Models\Central\ContactLocation;
use App\Models\Central\Media;
use App\Models\Central\NavbarNotification;
use App\Models\Central\Plan;
use App\Models\Central\ResourceArticle;
use App\Models\Central\ResourceCategory;
use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsiteFeature;
use App\Models\Central\WebsiteMenu;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsitePopup;
use App\Models\Central\WebsiteRedirect;
use App\Models\Central\WebsiteSocialLink;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
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
        if ($response = $this->redirectForCurrentPath()) {
            return $response;
        }

        return $this->publicRender($slug);
    }

    public function blog(Request $request, ?string $category = null, ?string $tag = null)
    {
        if ($disabled = $this->disabledWebsite()) {
            return $disabled;
        }
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
        if ($response = $this->redirectForCurrentPath()) {
            return $response;
        }

        return $this->blog($request, $category);
    }

    public function tag(Request $request, string $tag)
    {
        if ($response = $this->redirectForCurrentPath()) {
            return $response;
        }

        return $this->blog($request, null, $tag);
    }

    public function post(string $slug)
    {
        if ($response = $this->redirectForCurrentPath()) {
            return $response;
        }
        if ($disabled = $this->disabledWebsite()) {
            return $disabled;
        }
        $post = BlogPost::with(['categories', 'tags', 'featuredMedia'])->where('slug', $slug)->where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->firstOrFail();
        if (blank($post->canonical_url)) {
            $post->canonical_url = rtrim((string) app(PlatformSettingsService::class)->get('seo.canonical_base_url', config('app.url')), '/').'/blog/'.$post->slug;
        }
        $related = BlogPost::where('status', 'published')->where('visibility', 'public')->where('published_at', '<=', now())->whereKeyNot($post->id)->whereHas('categories', fn ($q) => $q->whereIn('blog_categories.id', $post->categories->pluck('id')))->latest('published_at')->limit(3)->get();

        return Inertia::render('Central/Website/Post', $this->sharedPublic() + ['post' => $post, 'related' => $related]);
    }

    public function sitemap(PlatformSettingsService $settings)
    {
        abort_unless($settings->get('website.website_enabled', true), 404);
        abort_unless($settings->get('seo.sitemap_enabled', true), 404);
        $base = rtrim((string) $settings->get('seo.canonical_base_url', config('app.url')), '/');
        $xml = Cache::remember('website-sitemap', now()->addMinutes((int) $settings->get('seo.sitemap_cache_duration', 60)), function () use ($settings, $base): string {
            $urls = collect();
            if ($settings->get('seo.include_pages', true)) {
                $urls = $urls->merge(WebsitePage::where('status', 'published')->where('visibility', 'public')->where('sitemap_include', true)->where(fn ($query) => $query->whereNull('published_at')->orWhere('published_at', '<=', now()))->get()->map(fn ($page) => [$base.$page->publicPath(), $page->updated_at, $page->sitemap_priority, $page->sitemap_change_frequency]));
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
            $urls = $urls->merge(ResourceArticle::where('status', 'published')->where('published_at', '<=', now())->get()->map(fn ($article) => [$base.'/resources/'.$article->slug, $article->updated_at, 0.6, 'monthly']));

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
        if ($disabled = $this->disabledWebsite()) {
            return $disabled;
        }
        $page = Cache::remember('website-page:v2:'.$slugOrType, now()->addMinutes(30), function () use ($slugOrType): array {
            $page = WebsitePage::with(['sections' => fn ($q) => $q->with('media')->where('is_active', true)->orderBy('sort_order')])
                ->where('status', 'published')
                ->where('visibility', 'public')
                ->where(fn ($query) => $query->whereNull('published_at')->orWhere('published_at', '<=', now()))
                ->where(fn ($query) => $query->where('slug', $slugOrType)->orWhere('page_type', $slugOrType))
                ->firstOrFail();
            if (blank($page->canonical_url)) {
                $base = rtrim((string) app(PlatformSettingsService::class)->get('seo.canonical_base_url', config('app.url')), '/');
                $page->setAttribute('canonical_url', $base.$page->publicPath());
            }

            return $this->hydrateSectionItemMedia($page->toArray());
        });

        $content = Cache::remember('website-content:v1', now()->addMinutes(30), fn (): array => WebsiteContentItem::with('media')
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
            'websiteFeatures' => $page['page_type'] === 'features' ? WebsiteFeature::with('featuredMedia')->where('status', 'published')->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))->orderBy('sort_order')->get() : [],
            'locations' => $page['page_type'] === 'contact' ? ContactLocation::where('is_active', true)->orderBy('sort_order')->get() : [],
        ] + $extra);
    }

    public function resources(Request $request)
    {
        if ($disabled = $this->disabledWebsite()) {
            return $disabled;
        }
        $query = ResourceArticle::with(['category:id,name,slug', 'featuredMedia'])->where('status', 'published')->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()));
        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('excerpt', 'like', $term)->orWhere('body', 'like', $term));
        }

        return Inertia::render('Central/Website/Resources', $this->sharedPublic() + [
            'articles' => $query->orderBy('sort_order')->latest('published_at')->paginate(12)->withQueryString(),
            'categories' => ResourceCategory::where('status', 'active')->withCount(['articles' => fn ($q) => $q->where('status', 'published')])->orderBy('sort_order')->get(),
            'filters' => $request->only(['search', 'category']),
        ]);
    }

    public function resourceArticle(string $slug)
    {
        if ($response = $this->redirectForCurrentPath()) {
            return $response;
        }
        if ($disabled = $this->disabledWebsite()) {
            return $disabled;
        }
        $article = ResourceArticle::with(['category:id,name,slug', 'featuredMedia'])->where('slug', $slug)->where('status', 'published')->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))->firstOrFail();
        $article->setAttribute('gallery', Media::whereIn('id', $article->gallery_media_ids ?? [])->get());

        return Inertia::render('Central/Website/ResourceArticle', $this->sharedPublic() + ['article' => $article]);
    }

    private function sharedPublic(): array
    {
        $menus = Cache::remember('website-menus:v2', now()->addMinutes(30), fn (): array => WebsiteMenu::with(['page:id,title,slug', 'children' => fn ($query) => $query->with('page:id,title,slug')->publiclyVisible()->orderBy('sort_order')])
            ->whereNull('parent_id')
            ->publiclyVisible()
            ->orderBy('sort_order')
            ->get()
            ->groupBy('location')
            ->map(fn ($items) => $items->values()->toArray())
            ->all());

        $activeWindow = fn ($q) => $q->where('is_active', true)->where(fn ($w) => $w->whereNull('starts_at')->orWhere('starts_at', '<=', now()))->where(fn ($w) => $w->whereNull('ends_at')->orWhere('ends_at', '>=', now()));

        return [
            'menus' => $menus, 'site' => app(PlatformSettingsService::class)->publicSettings(),
            'socialLinks' => WebsiteSocialLink::where('is_active', true)->orderBy('sort_order')->get(),
            'navbarNotifications' => NavbarNotification::where($activeWindow)->orderBy('sort_order')->get(),
            'websitePopup' => WebsitePopup::with('media')->where($activeWindow)->latest()->first(),
        ];
    }

    private function disabledWebsite()
    {
        $settings = app(PlatformSettingsService::class);
        if ($settings->get('website.website_enabled', true)) {
            return null;
        }

        return Inertia::render('Central/Website/Disabled', ['site' => $settings->publicSettings()])->toResponse(request())->setStatusCode(503);
    }

    private function hydrateSectionItemMedia(array $page): array
    {
        $ids = collect($page['sections'] ?? [])->flatMap(fn (array $section) => collect($section['items'] ?? [])->pluck('media_id'))->filter()->unique();
        if ($ids->isEmpty()) {
            return $page;
        }

        $media = Media::whereIn('id', $ids)->get()->keyBy('id');
        $page['sections'] = collect($page['sections'])->map(function (array $section) use ($media): array {
            $section['items'] = collect($section['items'] ?? [])->map(function (array $item) use ($media): array {
                if ($asset = $media->get($item['media_id'] ?? null)) {
                    $item['media'] = $asset->only(['id', 'url', 'width', 'height', 'original_filename', 'alt_text', 'mime_type']);
                }

                return $item;
            })->all();

            return $section;
        })->all();

        return $page;
    }

    private function redirectForCurrentPath()
    {
        if (! Schema::connection(config('tenancy.database.central_connection'))->hasTable('website_redirects')) {
            return null;
        }

        $redirect = WebsiteRedirect::where('source_path', request()->getPathInfo())->first();
        if (! $redirect) {
            return null;
        }

        $redirect->increment('hits');
        $redirect->update(['last_hit_at' => now()]);

        return redirect($redirect->destination_path, $redirect->status_code);
    }
}
