<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogCategory;
use App\Models\Central\BlogTag;
use App\Models\Central\Media;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BlogTaxonomyController extends Controller
{
    public function index(Request $request, string $type)
    {
        $model = $this->model($type);
        $query = $model::query()->withCount('posts');
        if ($type === 'categories') {
            $query->with(['parent:id,name']);
        }
        if ($request->filled('search')) {
            $query->where(fn ($builder) => $builder->where('name', 'like', '%'.$request->string('search').'%')->orWhere('slug', 'like', '%'.$request->string('search').'%'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return Inertia::render('Central/Blog/Taxonomies', [
            'type' => $type,
            'items' => $query->orderBy($type === 'categories' ? 'sort_order' : 'name')->paginate(30)->withQueryString(),
            'filters' => $request->only(['search', 'status']),
            'categories' => $type === 'categories' ? BlogCategory::orderBy('name')->get(['id', 'name']) : [],
            'media' => $type === 'categories' ? Media::where('mime_type', 'like', 'image/%')->latest()->limit(200)->get(['id', 'original_filename as filename', 'disk', 'path']) : [],
        ]);
    }

    public function store(Request $request, string $type, CentralAuditService $audit)
    {
        $class = $this->model($type);
        $item = $class::create($this->validated($request, $type));
        $audit->log($request, 'blog_'.$type.'.created', $item, [], $item->toArray());

        return back()->with('success', ucfirst(rtrim($type, 's')).' created.');
    }

    public function update(Request $request, string $type, int $id, CentralAuditService $audit)
    {
        $item = $this->find($type, $id);
        $old = $item->toArray();
        $item->update($this->validated($request, $type, $item));
        $audit->log($request, 'blog_'.$type.'.updated', $item, $old, $item->fresh()->toArray());

        return back()->with('success', ucfirst(rtrim($type, 's')).' updated.');
    }

    public function destroy(Request $request, string $type, int $id, CentralAuditService $audit)
    {
        $item = $this->find($type, $id);
        abort_if($type === 'categories' && BlogCategory::where('parent_id', $item->id)->exists(), 422, 'Move child categories before deleting this category.');
        $audit->log($request, 'blog_'.$type.'.deleted', $item, $item->toArray(), []);
        $item->delete();

        return back()->with('success', ucfirst(rtrim($type, 's')).' moved to trash.');
    }

    private function model(string $type): string
    {
        return match ($type) {
            'categories' => BlogCategory::class, 'tags' => BlogTag::class, default => abort(404)
        };
    }

    private function find(string $type, int $id): Model
    {
        $class = $this->model($type);

        return $class::findOrFail($id);
    }

    private function validated(Request $request, string $type, ?Model $item = null): array
    {
        $table = $type === 'categories' ? 'blog_categories' : 'blog_tags';
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique($table)->ignore($item)],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
        if ($type === 'categories') {
            $rules += [
                'parent_id' => ['nullable', 'integer', Rule::exists('blog_categories', 'id')->whereNull('deleted_at'), Rule::notIn([$item?->id])],
                'media_id' => ['nullable', 'integer', 'exists:central_media,id'],
                'seo_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string', 'max:320'],
                'canonical_url' => ['nullable', 'url', 'max:2048'],
                'sort_order' => ['required', 'integer', 'min:0'],
            ];
        }

        return $request->validate($rules);
    }
}
