<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogCategory;
use App\Models\Central\BlogPost;
use App\Models\Central\BlogTag;
use App\Models\Central\CentralAdmin;
use App\Models\Central\Media;
use App\Models\Central\WebsiteMenu;
use App\Models\Central\WebsiteRevision;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $query = BlogPost::with(['categories:id,name', 'tags:id,name', 'author:id,name']);
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('slug', 'like', $term));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('category_id')) {
            $query->whereHas('categories', fn ($q) => $q->whereKey($request->integer('category_id')));
        }
        if ($request->filled('tag_id')) {
            $query->whereHas('tags', fn ($q) => $q->whereKey($request->integer('tag_id')));
        }
        if ($request->filled('author_id')) {
            $query->where('created_by', $request->integer('author_id'));
        }
        if ($request->filled('published_from')) {
            $query->whereDate('published_at', '>=', $request->date('published_from'));
        }
        if ($request->filled('published_to')) {
            $query->whereDate('published_at', '<=', $request->date('published_to'));
        }

        return Inertia::render('Central/Blog/Index', ['posts' => $query->latest('updated_at')->paginate(25)->withQueryString(), 'categories' => BlogCategory::orderBy('name')->get(), 'tags' => BlogTag::orderBy('name')->get(), 'authors' => CentralAdmin::orderBy('name')->get(['id', 'name']), 'filters' => $request->all()]);
    }

    public function create()
    {
        return $this->editor(new BlogPost);
    }

    public function edit(BlogPost $post)
    {
        return $this->editor($post->load(['categories:id', 'tags:id']));
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $data = $this->validatePost($request);
        $post = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($request, $data) {
            $relations = collect($data)->only(['category_ids', 'tag_ids'])->all();
            $data = collect($data)->except(['category_ids', 'tag_ids'])->all();
            $data['created_by'] = $data['updated_by'] = $request->user('central')->id;
            if ($data['status'] === 'published' && empty($data['published_at'])) {
                $data['published_at'] = now();
            }
            if ($data['status'] !== 'scheduled') {
                $data['scheduled_at'] = null;
            }
            $post = BlogPost::create($data);
            $post->categories()->sync($relations['category_ids'] ?? []);
            $post->tags()->sync($relations['tag_ids'] ?? []);
            $this->revision($post, $request->user('central')->id);

            return $post;
        });
        $audit->log($request, 'blog.created', $post, [], ['title' => $post->title, 'status' => $post->status]);

        return redirect()->route('central.blog.edit', $post)->with('success', 'Post created.');
    }

    public function update(Request $request, BlogPost $post, CentralAuditService $audit)
    {
        $data = $this->validatePost($request, $post);
        $old = $post->only(['title', 'slug', 'status', 'published_at']);
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($request, $data, $post) {
            $this->revision($post, $request->user('central')->id);
            $categories = $data['category_ids'] ?? [];
            $tags = $data['tag_ids'] ?? [];
            unset($data['category_ids'], $data['tag_ids']);
            $data['updated_by'] = $request->user('central')->id;
            if ($data['status'] === 'published' && empty($data['published_at'])) {
                $data['published_at'] = now();
            }
            if ($data['status'] !== 'scheduled') {
                $data['scheduled_at'] = null;
            }
            $post->update($data);
            $post->categories()->sync($categories);
            $post->tags()->sync($tags);
        });
        $audit->log($request, 'blog.updated', $post, $old, $post->only(['title', 'slug', 'status', 'published_at']));

        return back()->with('success', 'Post saved.');
    }

    public function destroy(Request $request, BlogPost $post, CentralAuditService $audit)
    {
        $audit->log($request, 'blog.deleted', $post, $post->only(['title', 'slug', 'status']), []);
        $post->delete();

        return redirect()->route('central.blog.index')->with('success', 'Post moved to trash.');
    }

    public function bulk(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate(['ids' => ['required', 'array', 'max:100'], 'ids.*' => ['integer', 'exists:blog_posts,id'], 'action' => ['required', Rule::in(['publish', 'archive', 'delete'])]]);
        $query = BlogPost::whereIn('id', $data['ids']);
        match ($data['action']) {
            'publish' => $query->update(['status' => 'published', 'published_at' => now()]), 'archive' => $query->update(['status' => 'archived']), 'delete' => $query->delete()
        };
        $audit->log($request, 'blog.bulk_'.$data['action'], null, [], ['ids' => $data['ids'], 'count' => count($data['ids'])]);

        return back()->with('success', 'Bulk action completed.');
    }

    public function duplicate(Request $request, BlogPost $post, CentralAuditService $audit)
    {
        $copy = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($request, $post): BlogPost {
            $copy = $post->replicate(['published_at', 'scheduled_at']);
            $copy->title = $post->title.' (Copy)';
            $copy->slug = $post->slug.'-copy-'.str()->lower(str()->random(5));
            $copy->status = 'draft';
            $copy->is_featured = false;
            $copy->created_by = $copy->updated_by = $request->user('central')->id;
            $copy->save();
            $copy->categories()->sync($post->categories()->pluck('blog_categories.id'));
            $copy->tags()->sync($post->tags()->pluck('blog_tags.id'));

            return $copy;
        });
        $audit->log($request, 'blog.duplicated', $copy, [], ['source_id' => $post->id]);

        return redirect()->route('central.blog.edit', $copy)->with('success', 'Draft copy created.');
    }

    public function quickUpdate(Request $request, BlogPost $post, CentralAuditService $audit)
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:255'], 'status' => ['required', Rule::in(['draft', 'review', 'scheduled', 'published', 'archived'])], 'published_at' => ['nullable', 'date'], 'scheduled_at' => ['nullable', 'date', 'required_if:status,scheduled']]);
        $before = $post->only(array_keys($data));
        $this->revision($post, $request->user('central')->id);
        if ($data['status'] === 'published' && blank($data['published_at'])) {
            $data['published_at'] = now();
        }
        if ($data['status'] !== 'scheduled') {
            $data['scheduled_at'] = null;
        }
        $post->update($data + ['updated_by' => $request->user('central')->id]);
        $audit->log($request, 'blog.quick_updated', $post, $before, $data);

        return back()->with('success', 'Post updated.');
    }

    public function preview(BlogPost $post, PlatformSettingsService $settings)
    {
        $post->load(['categories', 'tags', 'featuredMedia']);
        if (blank($post->canonical_url)) {
            $post->canonical_url = rtrim((string) $settings->get('seo.canonical_base_url', config('app.url')), '/').'/blog/'.$post->slug;
        }
        $menus = WebsiteMenu::with(['page:id,title,slug', 'children.page:id,title,slug'])->whereNull('parent_id')->where('is_active', true)->orderBy('sort_order')->get()->groupBy('location');

        return Inertia::render('Central/Website/Post', ['post' => $post, 'related' => [], 'menus' => $menus, 'site' => $settings->publicSettings(), 'isPreview' => true]);
    }

    public function restoreRevision(Request $request, BlogPost $post, WebsiteRevision $revision, CentralAuditService $audit)
    {
        abort_unless($revision->revisionable_type === BlogPost::class && $revision->revisionable_id === $post->id, 404);
        $before = $post->toArray();
        $this->revision($post, $request->user('central')->id);
        $post->update(collect($revision->snapshot)->only(array_keys($this->postRules($post)))->except(['category_ids', 'tag_ids'])->all() + ['updated_by' => $request->user('central')->id]);
        $audit->log($request, 'blog.revision_restored', $post, $before, $post->fresh()->toArray());

        return back()->with('success', 'Post revision restored.');
    }

    private function editor(BlogPost $post)
    {
        return Inertia::render('Central/Blog/Editor', ['post' => $post, 'categories' => BlogCategory::where('status', 'active')->orderBy('name')->get(), 'tags' => BlogTag::where('status', 'active')->orderBy('name')->get(), 'media' => Media::where('mime_type', 'like', 'image/%')->latest()->limit(100)->get(), 'revisions' => $post->exists ? $post->revisions()->limit(30)->get() : []]);
    }

    private function validatePost(Request $request, ?BlogPost $post = null): array
    {
        return $request->validate($this->postRules($post));
    }

    private function postRules(?BlogPost $post = null): array
    {
        return [
            'title' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('blog_posts')->ignore($post)],
            'excerpt' => ['nullable', 'string', 'max:1000'], 'content' => ['nullable', 'string', 'max:1000000'], 'featured_media_id' => ['nullable', 'exists:central_media,id'],
            'featured_image_alt' => ['nullable', 'string', 'max:255'], 'status' => ['required', Rule::in(['draft', 'review', 'scheduled', 'published', 'archived'])],
            'visibility' => ['required', Rule::in(['public', 'private'])], 'published_at' => ['nullable', 'date'], 'scheduled_at' => ['nullable', 'date', 'required_if:status,scheduled'], 'is_featured' => ['boolean'],
            'category_ids' => ['array'], 'category_ids.*' => ['integer', 'exists:blog_categories,id'], 'tag_ids' => ['array'], 'tag_ids.*' => ['integer', 'exists:blog_tags,id'],
            'seo_title' => ['nullable', 'string', 'max:255'], 'meta_description' => ['nullable', 'string', 'max:320'], 'focus_keyword' => ['nullable', 'string', 'max:255'],
            'canonical_url' => ['nullable', 'url', 'max:2048'], 'robots_index' => ['boolean'], 'robots_follow' => ['boolean'], 'og_title' => ['nullable', 'string', 'max:255'],
            'og_description' => ['nullable', 'string', 'max:500'], 'og_image' => ['nullable', 'string', 'max:2048'], 'twitter_title' => ['nullable', 'string', 'max:255'],
            'twitter_description' => ['nullable', 'string', 'max:500'], 'twitter_image' => ['nullable', 'string', 'max:2048'], 'article_schema' => ['nullable', 'array'],
            'sitemap_include' => ['boolean'], 'sitemap_priority' => ['numeric', 'between:0,1'],
        ];
    }

    private function revision(BlogPost $post, int $adminId): void
    {
        DB::connection(config('tenancy.database.central_connection'))->table('website_revisions')->insert(['revisionable_type' => BlogPost::class, 'revisionable_id' => $post->id, 'admin_id' => $adminId, 'snapshot' => json_encode($post->fresh()->toArray()), 'created_at' => now()]);
    }
}
