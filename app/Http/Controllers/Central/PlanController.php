<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Feature;
use App\Models\Central\Plan;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PlanController extends Controller
{
    public function index()
    {
        return Inertia::render('Central/Plans/Index', ['plans' => Plan::withCount('features')->orderBy('sort_order')->get()]);
    }

    public function create()
    {
        return Inertia::render('Central/Plans/Form', ['featureCatalog' => $this->catalog()]);
    }

    public function edit(Plan $plan)
    {
        $plan->load('plansFeatureRegistry');

        return Inertia::render('Central/Plans/Form', ['plan' => $plan, 'featureCatalog' => $this->catalog(), 'featureAssignments' => $plan->plansFeatureRegistry->mapWithKeys(fn ($feature) => [$feature->id => $feature->pivot])]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $data = $this->validated($request);
        $plan = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($data): Plan {
            $features = $data['feature_registry'] ?? [];
            unset($data['feature_registry']);
            $plan = Plan::create($data);
            $this->syncFeatures($plan, $features);

            return $plan;
        });
        $audit->log($request, 'plan.created', $plan, [], ['name' => $plan->name, 'feature_count' => count($request->input('feature_registry', []))]);

        return redirect()->route('central.plans.edit', $plan);
    }

    public function update(Request $request, Plan $plan, CentralAuditService $audit)
    {
        $data = $this->validated($request, $plan);
        $old = $plan->toArray();
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($data, $plan): void {
            $features = $data['feature_registry'] ?? [];
            unset($data['feature_registry']);
            $plan->update($data);
            $this->syncFeatures($plan, $features);
        });
        $audit->log($request, 'plan.updated', $plan, $old, ['name' => $plan->name, 'feature_count' => count($request->input('feature_registry', []))]);

        return back();
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'slug' => ['required', 'alpha_dash', Rule::unique('plans')->ignore($plan)], 'description' => ['nullable', 'string'], 'price_monthly' => ['required', 'numeric', 'min:0'], 'price_yearly' => ['required', 'numeric', 'min:0'], 'currency' => ['required', 'string', 'size:3'], 'trial_days' => ['required', 'integer', 'min:0', 'max:365'], 'sort_order' => ['integer', 'min:0'], 'is_active' => ['boolean'], 'is_featured' => ['boolean'], 'max_users' => ['nullable', 'integer', 'min:0'], 'max_branches' => ['nullable', 'integer', 'min:0'], 'max_products' => ['nullable', 'integer', 'min:0'], 'max_customers' => ['nullable', 'integer', 'min:0'], 'max_invoices_per_month' => ['nullable', 'integer', 'min:0'], 'max_storage_mb' => ['nullable', 'integer', 'min:0'], 'max_ai_requests_per_month' => ['nullable', 'integer', 'min:0'], 'max_api_requests_per_month' => ['nullable', 'integer', 'min:0'], 'max_custom_domains' => ['nullable', 'integer', 'min:0'], 'max_warehouses' => ['nullable', 'integer', 'min:0'], 'allow_pos' => ['boolean'], 'allow_inventory' => ['boolean'], 'allow_hrm' => ['boolean'], 'allow_crm' => ['boolean'], 'allow_warehouse' => ['boolean'], 'allow_ai' => ['boolean'], 'allow_custom_domain' => ['boolean'], 'allow_multi_branch' => ['boolean'], 'allow_api_access' => ['boolean'], 'feature_registry' => ['array'], 'feature_registry.*.feature_id' => ['required', 'integer', 'distinct', 'exists:features,id'], 'feature_registry.*.enabled' => ['boolean'], 'feature_registry.*.value' => ['nullable'], 'feature_registry.*.inherit_default' => ['boolean'], 'feature_registry.*.display_on_pricing' => ['boolean'], 'feature_registry.*.pricing_label' => ['nullable', 'string', 'max:255']]);
        $registry = Feature::whereIn('id', collect($data['feature_registry'] ?? [])->pluck('feature_id'))->get()->keyBy('id');
        foreach ($data['feature_registry'] ?? [] as $index => $item) {
            $feature = $registry->get($item['feature_id']);
            if ($feature?->type === 'json' && ! ($item['inherit_default'] ?? true) && is_string($item['value'] ?? null)) {
                json_decode($item['value'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw ValidationException::withMessages(["feature_registry.$index.value" => 'Enter valid JSON.']);
                }
            }
        }

        return $data;
    }

    private function catalog()
    {
        return Feature::where('is_active', true)->orderBy('category')->orderBy('sort_order')->get();
    }

    private function syncFeatures(Plan $plan, array $features): void
    {
        $registry = Feature::whereIn('id', collect($features)->pluck('feature_id'))->get()->keyBy('id');
        $sync = collect($features)->mapWithKeys(function ($item) use ($registry): array {
            $feature = $registry->get($item['feature_id']);
            $value = $feature?->type === 'boolean' ? null : (is_array($item['value'] ?? null) ? json_encode($item['value']) : ($item['value'] ?? null));

            return [$item['feature_id'] => [
                'enabled' => (bool) ($item['enabled'] ?? false), 'value' => $value,
                'limit_value' => $feature?->type === 'integer' && is_numeric($value) ? (int) $value : null, 'inherit_default' => (bool) ($item['inherit_default'] ?? true),
                'display_on_pricing' => (bool) ($item['display_on_pricing'] ?? true), 'pricing_label' => $item['pricing_label'] ?? null,
            ]];
        })->all();
        $plan->plansFeatureRegistry()->sync($sync);
        Cache::increment('feature-registry-version');
    }
}
