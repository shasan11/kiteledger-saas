<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Feature;
use App\Models\Central\TenantFeatureOverride;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class FeatureController extends Controller
{
    public function index(Request $request)
    {
        $query = Feature::withCount('plans');
        if ($request->filled('search')) {
            $query->where(fn ($builder) => $builder->where('name', 'like', '%'.$request->string('search').'%')->orWhere('key', 'like', '%'.$request->string('search').'%'));
        }
        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }
        if ($request->filled('status')) {
            $query->where('is_active', $request->string('status')->toString() === 'active');
        }

        return Inertia::render('Central/Features/Index', [
            'features' => $query->orderBy('category')->orderBy('sort_order')->paginate(30)->withQueryString(),
            'categories' => Feature::distinct()->orderBy('category')->pluck('category'),
            'filters' => $request->only(['search', 'category', 'type', 'status']),
        ]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $feature = Feature::create($this->validated($request));
        $audit->log($request, 'feature.created', $feature, [], $feature->toArray());

        return back()->with('success', 'Feature created.');
    }

    public function update(Request $request, Feature $feature, CentralAuditService $audit)
    {
        $old = $feature->toArray();
        $feature->update($this->validated($request, $feature));
        $audit->log($request, 'feature.updated', $feature, $old, $feature->fresh()->toArray());

        return back()->with('success', 'Feature updated.');
    }

    public function destroy(Request $request, Feature $feature, CentralAuditService $audit)
    {
        abort_if($feature->plans()->exists() || TenantFeatureOverride::where('feature_id', $feature->id)->exists(), 422, 'Remove plan assignments and tenant overrides before deleting this feature.');
        $audit->log($request, 'feature.deleted', $feature, $feature->toArray(), []);
        $feature->delete();

        return back()->with('success', 'Feature deleted.');
    }

    private function validated(Request $request, ?Feature $feature = null): array
    {
        if (is_array($request->input('category'))) {
            $request->merge(['category' => collect($request->input('category'))->first()]);
        }
        $data = $request->validate([
            'key' => ['required', 'alpha_dash', 'max:255', Rule::unique('features')->ignore($feature)],
            'name' => ['required', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:10000'],
            'category' => ['required', 'string', 'max:100'], 'type' => ['required', Rule::in(['boolean', 'integer', 'decimal', 'string', 'json'])],
            'default_value' => ['nullable'], 'is_active' => ['boolean'], 'is_visible' => ['boolean'], 'is_billable' => ['boolean'],
            'unit_label' => ['nullable', 'string', 'max:100'], 'sort_order' => ['required', 'integer', 'min:0'],
        ]);
        if ($data['type'] === 'json' && is_string($data['default_value'] ?? null)) {
            $data['default_value'] = json_decode($data['default_value'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw ValidationException::withMessages(['default_value' => 'Enter valid JSON.']);
            }
        }

        return $data;
    }
}
