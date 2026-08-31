<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\ContactLocation;
use App\Models\Central\Media;
use App\Models\Central\NavbarNotification;
use App\Models\Central\ResourceArticle;
use App\Models\Central\ResourceCategory;
use App\Models\Central\WebsiteFeature;
use App\Models\Central\WebsitePopup;
use App\Models\Central\WebsiteRedirect;
use App\Models\Central\WebsiteSocialLink;
use App\Services\SaaS\CentralAuditService;
use App\Support\SafeHtml;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class WebsiteStructuredContentController extends Controller
{
    private const MODELS = [
        'features' => WebsiteFeature::class, 'resource-categories' => ResourceCategory::class, 'resource-articles' => ResourceArticle::class,
        'contact-locations' => ContactLocation::class, 'social-links' => WebsiteSocialLink::class, 'popups' => WebsitePopup::class, 'navbar-notifications' => NavbarNotification::class,
    ];

    public function index(Request $request, string $resource)
    {
        $class = self::MODELS[$resource] ?? abort(404);
        $query = $class::query();
        if ($resource === 'resource-articles') {
            $query->with('category:id,name');
        }
        if (in_array($resource, ['features', 'resource-articles'], true)) {
            $query->with('featuredMedia');
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(function ($q) use ($term): void {
                foreach (['title', 'name', 'content', 'platform'] as $field) {
                    if (in_array($field, $q->getModel()->getConnection()->getSchemaBuilder()->getColumnListing($q->getModel()->getTable()), true)) {
                        $q->orWhere($field, 'like', $term);
                    }
                }
            });
        }

        return Inertia::render('Central/Website/StructuredContent', [
            'resource' => $resource, 'rows' => $query->orderBy('sort_order')->paginate(30)->withQueryString(), 'filters' => $request->only('search'),
            'categories' => ResourceCategory::where('status', 'active')->orderBy('sort_order')->get(['id', 'name']),
            'media' => Media::where('mime_type', 'like', 'image/%')->latest()->get(['id', 'title', 'original_filename', 'path', 'disk']),
        ]);
    }

    public function store(Request $request, string $resource, CentralAuditService $audit)
    {
        $class = self::MODELS[$resource] ?? abort(404);
        $model = $class::create($this->validated($request, $resource));
        if ($model instanceof ResourceArticle) {
            WebsiteRedirect::where('source_path', '/resources/'.$model->slug)->delete();
        }
        $audit->log($request, 'website.'.str_replace('-', '_', $resource).'.created', $model, [], $model->toArray());

        return back()->with('success', 'Content created.');
    }

    public function update(Request $request, string $resource, int $id, CentralAuditService $audit)
    {
        $class = self::MODELS[$resource] ?? abort(404);
        $model = $class::findOrFail($id);
        $before = $model->toArray();
        $oldPath = $model instanceof ResourceArticle ? '/resources/'.$model->slug : null;
        $model->update($this->validated($request, $resource, $model));
        if ($model instanceof ResourceArticle) {
            $newPath = '/resources/'.$model->slug;
            WebsiteRedirect::where('source_path', $newPath)->delete();
            if ($oldPath !== $newPath) {
                WebsiteRedirect::updateOrCreate(['source_path' => $oldPath], ['destination_path' => $newPath, 'status_code' => 301]);
            }
        }
        $audit->log($request, 'website.'.str_replace('-', '_', $resource).'.updated', $model, $before, $model->fresh()->toArray());

        return back()->with('success', 'Content saved.');
    }

    public function destroy(Request $request, string $resource, int $id, CentralAuditService $audit)
    {
        $class = self::MODELS[$resource] ?? abort(404);
        $model = $class::findOrFail($id);
        if ($model instanceof ResourceCategory && $model->articles()->exists()) {
            return back()->with('error', 'Move or remove this category’s articles first.');
        }
        $audit->log($request, 'website.'.str_replace('-', '_', $resource).'.deleted', $model, $model->toArray(), []);
        $model->delete();

        return back()->with('success', 'Content removed.');
    }

    private function validated(Request $request, string $resource, ?Model $model = null): array
    {
        $rules = match ($resource) {
            'features' => ['title' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('website_features')->ignore($model)], 'excerpt' => ['nullable', 'string', 'max:2000'], 'body' => ['nullable', 'string', 'max:100000'], 'featured_media_id' => ['nullable', 'exists:central_media,id'], 'status' => ['required', Rule::in(['draft', 'published', 'archived'])], 'sort_order' => ['required', 'integer', 'min:0'], 'seo_title' => ['nullable', 'string', 'max:255'], 'meta_description' => ['nullable', 'string', 'max:500'], 'canonical_url' => ['nullable', 'url', 'max:2048'], 'og_title' => ['nullable', 'string', 'max:255'], 'og_description' => ['nullable', 'string', 'max:500'], 'og_image' => ['nullable', 'string', 'max:2048'], 'published_at' => ['nullable', 'date']],
            'resource-categories' => ['name' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('resource_categories')->ignore($model)], 'description' => ['nullable', 'string', 'max:5000'], 'status' => ['required', Rule::in(['active', 'inactive'])], 'sort_order' => ['required', 'integer', 'min:0']],
            'resource-articles' => ['category_id' => ['nullable', 'exists:resource_categories,id'], 'title' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('resource_articles')->ignore($model)], 'excerpt' => ['nullable', 'string', 'max:2000'], 'body' => ['required', 'string', 'max:200000'], 'featured_media_id' => ['nullable', 'exists:central_media,id'], 'gallery_media_ids' => ['nullable', 'array'], 'gallery_media_ids.*' => ['integer', 'exists:central_media,id'], 'status' => ['required', Rule::in(['draft', 'published', 'archived'])], 'sort_order' => ['required', 'integer', 'min:0'], 'seo_title' => ['nullable', 'string', 'max:255'], 'meta_description' => ['nullable', 'string', 'max:500'], 'canonical_url' => ['nullable', 'url', 'max:2048'], 'og_title' => ['nullable', 'string', 'max:255'], 'og_description' => ['nullable', 'string', 'max:500'], 'og_image' => ['nullable', 'string', 'max:2048'], 'published_at' => ['nullable', 'date']],
            'contact-locations' => ['name' => ['required', 'string', 'max:255'], 'address' => ['required', 'string', 'max:5000'], 'email' => ['nullable', 'email'], 'phone' => ['nullable', 'string', 'max:60'], 'business_hours' => ['nullable', 'string', 'max:2000'], 'map_embed_url' => ['nullable', 'url', 'max:3000'], 'is_active' => ['required', 'boolean'], 'sort_order' => ['required', 'integer', 'min:0']],
            'social-links' => ['platform' => ['required', 'string', 'max:100'], 'url' => ['required', 'url', 'max:2048'], 'icon' => ['nullable', 'string', 'max:100'], 'is_active' => ['required', 'boolean'], 'sort_order' => ['required', 'integer', 'min:0']],
            'popups' => ['title' => ['required', 'string', 'max:255'], 'content' => ['required', 'string', 'max:10000'], 'media_id' => ['nullable', 'exists:central_media,id'], 'cta_label' => ['nullable', 'string', 'max:100'], 'cta_url' => ['nullable', 'string', 'max:2048'], 'target' => ['required', Rule::in(['same_tab', 'new_tab'])], 'frequency' => ['required', Rule::in(['always', 'session', 'once'])], 'is_dismissible' => ['required', 'boolean'], 'is_active' => ['required', 'boolean'], 'starts_at' => ['nullable', 'date'], 'ends_at' => ['nullable', 'date', 'after:starts_at']],
            'navbar-notifications' => ['content' => ['required', 'string', 'max:2000'], 'link_label' => ['nullable', 'string', 'max:100'], 'link_url' => ['nullable', 'string', 'max:2048'], 'target' => ['required', Rule::in(['same_tab', 'new_tab'])], 'is_dismissible' => ['required', 'boolean'], 'is_active' => ['required', 'boolean'], 'sort_order' => ['required', 'integer', 'min:0'], 'starts_at' => ['nullable', 'date'], 'ends_at' => ['nullable', 'date', 'after:starts_at']],
        };
        $data = $request->validate($rules);
        if (isset($data['body'])) {
            $data['body'] = SafeHtml::clean($data['body']);
        }
        if (isset($data['content'])) {
            $data['content'] = trim(strip_tags($data['content']));
        }
        if (in_array($resource, ['features', 'resource-articles'], true) && ($data['status'] ?? '') === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }
}
