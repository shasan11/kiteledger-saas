<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Media;
use App\Models\Central\Plan;
use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsiteMenu;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsiteRevision;
use App\Models\Central\WebsiteSection;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class WebsiteContentController extends Controller
{
    public function pages(Request $request)
    {
        $query = WebsitePage::with(['parent:id,title', 'featuredMedia:id,path,disk'])->withCount('sections');
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($builder) => $builder->where('title', 'like', $term)->orWhere('slug', 'like', $term));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return Inertia::render('Central/Website/Pages/Index', ['pages' => $query->orderBy('sort_order')->paginate(25)->withQueryString(), 'filters' => $request->only('search', 'status')]);
    }

    public function createPage()
    {
        return $this->pageEditor(new WebsitePage(['status' => 'draft', 'visibility' => 'public', 'layout' => 'default', 'robots_index' => true, 'robots_follow' => true, 'sitemap_include' => true, 'sitemap_priority' => 0.5, 'sitemap_change_frequency' => 'monthly']));
    }

    public function editPage(WebsitePage $page)
    {
        $page->load(['featuredMedia', 'revisions']);

        return $this->pageEditor($page);
    }

    public function previewPage(WebsitePage $page, PlatformSettingsService $settings)
    {
        $page->load(['sections' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')]);
        $menus = WebsiteMenu::with(['page:id,title,slug', 'children' => fn ($query) => $query->with('page:id,title,slug')->where('is_active', true)])->whereNull('parent_id')->where('is_active', true)->orderBy('sort_order')->get()->groupBy('location');

        return Inertia::render('Central/Website/Page', [
            'page' => $page, 'menus' => $menus, 'site' => $settings->publicSettings(), 'isPreview' => true,
            'plans' => $page->page_type === 'pricing' ? Plan::where('is_active', true)->orderBy('sort_order')->get() : [],
            'faqs' => in_array($page->page_type, ['home', 'support'], true) ? WebsiteContentItem::where('type', 'faq')->where('status', 'published')->orderBy('sort_order')->get() : [],
            'testimonials' => $page->page_type === 'home' ? WebsiteContentItem::where('type', 'testimonial')->where('status', 'published')->orderBy('sort_order')->get() : [],
        ]);
    }

    public function storePage(Request $request, CentralAuditService $audit)
    {
        $data = $this->pageData($request);
        $data['created_by'] = $request->user('central')->id;
        $data['updated_by'] = $request->user('central')->id;
        $page = WebsitePage::create($data);
        $this->revision($page, $request->user('central')->id);
        $audit->log($request, 'website.page_created', $page, [], $page->toArray());

        return redirect()->route('central.website-pages.edit', $page)->with('success', 'Page created.');
    }

    public function updatePage(Request $request, WebsitePage $page, CentralAuditService $audit)
    {
        $before = $page->toArray();
        $this->revision($page, $request->user('central')->id);
        $page->update($this->pageData($request, $page) + ['updated_by' => $request->user('central')->id]);
        $audit->log($request, 'website.page_updated', $page, $before, $page->fresh()->toArray());

        return back()->with('success', 'Page saved.');
    }

    public function destroyPage(Request $request, WebsitePage $page, CentralAuditService $audit)
    {
        abort_if($page->page_type === 'home', 422, 'The homepage cannot be deleted. Archive it or replace its content instead.');
        $audit->log($request, 'website.page_deleted', $page, $page->toArray());
        $page->delete();

        return redirect()->route('central.website-pages.index')->with('success', 'Page removed.');
    }

    public function restorePageRevision(Request $request, WebsitePage $page, WebsiteRevision $revision, CentralAuditService $audit)
    {
        abort_unless($revision->revisionable_type === WebsitePage::class && $revision->revisionable_id === $page->id, 404);
        $before = $page->toArray();
        $this->revision($page, $request->user('central')->id);
        $allowed = collect($revision->snapshot)->only(array_keys($this->pageRules($page)))->all();
        $page->update($allowed + ['updated_by' => $request->user('central')->id]);
        $audit->log($request, 'website.page_revision_restored', $page, $before, $page->fresh()->toArray());

        return back()->with('success', 'Revision restored.');
    }

    public function sections(Request $request)
    {
        $pages = WebsitePage::orderBy('sort_order')->get(['id', 'title', 'slug']);
        $pageId = $request->integer('page_id') ?: $pages->first()?->id;

        return Inertia::render('Central/Website/Sections', [
            'pages' => $pages,
            'selectedPage' => $pageId,
            'sections' => WebsiteSection::where('page_id', $pageId)->orderBy('sort_order')->get(),
        ]);
    }

    public function storeSection(Request $request, CentralAuditService $audit)
    {
        $section = WebsiteSection::create($this->sectionData($request));
        $audit->log($request, 'website.section_created', $section, [], $section->toArray());

        return back()->with('success', 'Section added.');
    }

    public function updateSection(Request $request, WebsiteSection $section, CentralAuditService $audit)
    {
        $before = $section->toArray();
        $section->update($this->sectionData($request, $section));
        $audit->log($request, 'website.section_updated', $section, $before, $section->fresh()->toArray());

        return back()->with('success', 'Section saved.');
    }

    public function reorderSections(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate(['page_id' => ['required', 'exists:website_pages,id'], 'ids' => ['required', 'array'], 'ids.*' => ['integer', Rule::exists('website_sections', 'id')->where('page_id', $request->integer('page_id'))]]);
        DB::connection(config('tenancy.database.central_connection'))->transaction(fn () => collect($data['ids'])->each(fn ($id, $index) => WebsiteSection::whereKey($id)->update(['sort_order' => $index])));
        $audit->log($request, 'website.sections_reordered', null, [], ['page_id' => $data['page_id'], 'ids' => $data['ids']]);

        return back()->with('success', 'Section order saved.');
    }

    public function destroySection(Request $request, WebsiteSection $section, CentralAuditService $audit)
    {
        $audit->log($request, 'website.section_deleted', $section, $section->toArray());
        $section->delete();

        return back()->with('success', 'Section removed.');
    }

    public function menus(Request $request)
    {
        $location = $request->string('location', 'header')->toString();

        return Inertia::render('Central/Website/Menus', [
            'location' => $location,
            'menus' => WebsiteMenu::with(['page:id,title,slug'])->where('location', $location)->orderBy('sort_order')->get(),
            'pages' => WebsitePage::whereIn('status', ['draft', 'scheduled', 'published'])->orderBy('title')->get(['id', 'title', 'slug']),
            'locations' => ['header', 'footer', 'legal', 'product', 'resources'],
        ]);
    }

    public function storeMenu(Request $request, CentralAuditService $audit)
    {
        $menu = WebsiteMenu::create($this->menuData($request));
        $audit->log($request, 'website.menu_created', $menu, [], $menu->toArray());

        return back()->with('success', 'Menu item added.');
    }

    public function updateMenu(Request $request, WebsiteMenu $menu, CentralAuditService $audit)
    {
        $before = $menu->toArray();
        $menu->update($this->menuData($request, $menu));
        $audit->log($request, 'website.menu_updated', $menu, $before, $menu->fresh()->toArray());

        return back()->with('success', 'Menu item saved.');
    }

    public function reorderMenus(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate(['location' => ['required', Rule::in(['header', 'footer', 'legal', 'product', 'resources'])], 'ids' => ['required', 'array'], 'ids.*' => ['integer', 'exists:website_menus,id']]);
        DB::connection(config('tenancy.database.central_connection'))->transaction(fn () => collect($data['ids'])->each(fn ($id, $index) => WebsiteMenu::whereKey($id)->where('location', $data['location'])->update(['sort_order' => $index])));
        $audit->log($request, 'website.menus_reordered', null, [], $data);

        return back()->with('success', 'Menu order saved.');
    }

    public function destroyMenu(Request $request, WebsiteMenu $menu, CentralAuditService $audit)
    {
        $audit->log($request, 'website.menu_deleted', $menu, $menu->toArray());
        $menu->delete();

        return back()->with('success', 'Menu item removed.');
    }

    public function contentItems(Request $request, string $type)
    {
        abort_unless(in_array($type, ['faq', 'testimonial'], true), 404);
        $query = WebsiteContentItem::where('type', $type);
        if ($request->filled('search')) {
            $query->where(fn ($builder) => $builder->where('title', 'like', '%'.$request->string('search').'%')->orWhere('content', 'like', '%'.$request->string('search').'%'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return Inertia::render('Central/Website/ContentItems', ['type' => $type, 'items' => $query->orderBy('sort_order')->paginate(30)->withQueryString(), 'filters' => $request->only(['search', 'status'])]);
    }

    public function storeContentItem(Request $request, string $type, CentralAuditService $audit)
    {
        $item = WebsiteContentItem::create($this->contentItemData($request, $type) + ['type' => $type]);
        $audit->log($request, 'website.'.$type.'.created', $item, [], $item->toArray());

        return back()->with('success', ucfirst($type).' created.');
    }

    public function updateContentItem(Request $request, string $type, WebsiteContentItem $item, CentralAuditService $audit)
    {
        abort_unless($item->type === $type, 404);
        $old = $item->toArray();
        $item->update($this->contentItemData($request, $type, $item));
        $audit->log($request, 'website.'.$type.'.updated', $item, $old, $item->fresh()->toArray());

        return back()->with('success', ucfirst($type).' updated.');
    }

    public function destroyContentItem(Request $request, string $type, WebsiteContentItem $item, CentralAuditService $audit)
    {
        abort_unless($item->type === $type, 404);
        $audit->log($request, 'website.'.$type.'.deleted', $item, $item->toArray(), []);
        $item->delete();

        return back()->with('success', ucfirst($type).' moved to trash.');
    }

    private function pageEditor(WebsitePage $page)
    {
        return Inertia::render('Central/Website/Pages/Editor', [
            'page' => $page,
            'parents' => WebsitePage::when($page->exists, fn ($query) => $query->whereKeyNot($page->id))->orderBy('title')->get(['id', 'title']),
            'media' => Media::where('mime_type', 'like', 'image/%')->latest()->limit(100)->get(['id', 'title', 'original_filename', 'path', 'disk']),
            'revisions' => $page->exists ? $page->revisions()->limit(30)->get() : [],
        ]);
    }

    private function contentItemData(Request $request, string $type, ?WebsiteContentItem $item = null): array
    {
        abort_unless(in_array($type, ['faq', 'testimonial'], true), 404);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('website_content_items')->where('type', $type)->ignore($item)],
            'content' => ['required', 'string', 'max:50000'], 'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'sort_order' => ['required', 'integer', 'min:0'], 'published_at' => ['nullable', 'date'],
            'attribution' => ['nullable', 'string', 'max:255'], 'role' => ['nullable', 'string', 'max:255'], 'company' => ['nullable', 'string', 'max:255'], 'rating' => ['nullable', 'integer', 'between:1,5'],
        ]);
        $data['content'] = trim(strip_tags($data['content']));
        $data['data'] = collect($data)->only(['attribution', 'role', 'company', 'rating'])->filter(fn ($value) => filled($value))->all();
        unset($data['attribution'], $data['role'], $data['company'], $data['rating']);
        if ($data['status'] === 'published' && blank($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }

    private function pageData(Request $request, ?WebsitePage $page = null): array
    {
        $data = $request->validate($this->pageRules($page));
        if (($data['status'] ?? null) === 'published' && blank($data['published_at'] ?? null)) {
            $data['published_at'] = now();
        }
        if (($data['status'] ?? null) !== 'scheduled') {
            $data['scheduled_at'] = null;
        }
        if (is_string($data['schema_json'] ?? null)) {
            $data['schema_json'] = json_decode($data['schema_json'], true, 512, JSON_THROW_ON_ERROR);
        }

        return $data;
    }

    private function pageRules(?WebsitePage $page = null): array
    {
        return [
            'title' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', Rule::unique('website_pages')->ignore($page)],
            'page_type' => ['required', 'string', 'max:100'], 'excerpt' => ['nullable', 'string', 'max:2000'], 'body' => ['nullable', 'string'],
            'featured_media_id' => ['nullable', 'exists:central_media,id'], 'layout' => ['required', Rule::in(['default', 'landing', 'legal', 'support', 'full_width'])],
            'status' => ['required', Rule::in(['draft', 'scheduled', 'published', 'archived'])], 'visibility' => ['required', Rule::in(['public', 'private'])],
            'published_at' => ['nullable', 'date'], 'scheduled_at' => ['nullable', 'date', 'required_if:status,scheduled'], 'sort_order' => ['integer', 'min:0'],
            'parent_id' => ['nullable', 'exists:website_pages,id', Rule::notIn(array_filter([$page?->id]))],
            'meta_title' => ['nullable', 'string', 'max:255'], 'meta_description' => ['nullable', 'string', 'max:500'], 'focus_keyword' => ['nullable', 'string', 'max:255'],
            'canonical_url' => ['nullable', 'url', 'max:2048'], 'robots_index' => ['boolean'], 'robots_follow' => ['boolean'],
            'og_title' => ['nullable', 'string', 'max:255'], 'og_description' => ['nullable', 'string', 'max:500'], 'og_image' => ['nullable', 'string', 'max:2048'],
            'twitter_title' => ['nullable', 'string', 'max:255'], 'twitter_description' => ['nullable', 'string', 'max:500'], 'twitter_image' => ['nullable', 'string', 'max:2048'],
            'schema_json' => ['nullable', function (string $attribute, mixed $value, \Closure $fail): void {
                if (is_string($value)) {
                    try {
                        json_decode($value, true, 512, JSON_THROW_ON_ERROR);
                    } catch (\JsonException) {
                        $fail('The schema JSON must be valid JSON.');
                    }
                }
            }], 'sitemap_include' => ['boolean'], 'sitemap_priority' => ['numeric', 'between:0,1'], 'sitemap_change_frequency' => ['required', Rule::in(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])],
        ];
    }

    private function sectionData(Request $request, ?WebsiteSection $section = null): array
    {
        $data = $request->validate([
            'page_id' => ['required', 'exists:website_pages,id'], 'section_key' => ['required', 'alpha_dash', Rule::unique('website_sections')->where('page_id', $request->integer('page_id'))->ignore($section)],
            'section_type' => ['required', 'string', 'max:100'], 'title' => ['nullable', 'string', 'max:255'], 'subtitle' => ['nullable', 'string', 'max:500'], 'eyebrow' => ['nullable', 'string', 'max:100'],
            'content' => ['nullable', 'string'], 'image' => ['nullable', 'string', 'max:2048'], 'media_type' => ['nullable', Rule::in(['image', 'video'])], 'video_url' => ['nullable', 'url', 'max:2048'],
            'button_text' => ['nullable', 'string', 'max:100'], 'button_url' => ['nullable', 'string', 'max:2048'], 'secondary_button_text' => ['nullable', 'string', 'max:100'], 'secondary_button_url' => ['nullable', 'string', 'max:2048'],
            'background_style' => ['nullable', 'string', 'max:100'], 'alignment' => ['required', Rule::in(['left', 'center', 'right'])], 'is_active' => ['boolean'], 'sort_order' => ['integer', 'min:0'],
            'items' => ['nullable', 'array'], 'settings' => ['nullable', 'array'],
        ]);

        return $data;
    }

    private function menuData(Request $request, ?WebsiteMenu $menu = null): array
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:100'], 'location' => ['required', Rule::in(['header', 'footer', 'legal', 'product', 'resources'])],
            'page_id' => ['nullable', 'exists:website_pages,id'], 'url' => ['nullable', 'string', 'max:2048', 'required_without:page_id'],
            'parent_id' => ['nullable', 'exists:website_menus,id', Rule::notIn(array_filter([$menu?->id]))], 'target' => ['required', Rule::in(['same_tab', 'new_tab'])],
            'icon' => ['nullable', 'string', 'max:100'], 'is_active' => ['boolean'], 'sort_order' => ['integer', 'min:0'],
        ]);
        if (filled($data['page_id'] ?? null)) {
            $data['url'] = '/'.WebsitePage::findOrFail($data['page_id'])->slug;
        }

        return $data;
    }

    private function revision(Model $model, ?int $adminId): void
    {
        WebsiteRevision::create(['revisionable_type' => $model::class, 'revisionable_id' => $model->id, 'admin_id' => $adminId, 'snapshot' => $model->toArray()]);
    }
}
