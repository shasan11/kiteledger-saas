<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAuditLog;
use App\Models\Central\Feature;
use App\Models\Central\Tenant;
use App\Models\Central\TenantFeatureOverride;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlanFeatureResolver;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class FeatureOverrideController extends Controller
{
    public function index(Request $request, PlanFeatureResolver $resolver)
    {
        $tenants = Tenant::query()->with('plan')->orderBy('company_name')->get(['id', 'company_name', 'plan_id']);
        $tenant = $request->filled('tenant_id') ? $tenants->firstWhere('id', $request->string('tenant_id')->toString()) : $tenants->first();
        $features = Feature::query()->where('is_active', true)->orderBy('category')->orderBy('sort_order')->get();
        $overrides = $tenant ? TenantFeatureOverride::where('tenant_id', $tenant->id)->get()->keyBy('feature_id') : collect();

        $rows = $tenant ? $features->map(function (Feature $feature) use ($tenant, $overrides, $resolver) {
            $override = $overrides->get($feature->id);

            return [
                'feature' => $feature,
                'inherited_value' => $resolver->inheritedValue($tenant, $feature),
                'effective_value' => $resolver->value($tenant, $feature),
                'effective_source' => $resolver->effectiveSource($tenant, $feature),
                'override' => $override,
            ];
        })->values() : [];

        $expiring = TenantFeatureOverride::with(['tenant:id,company_name', 'feature:id,name,key'])
            ->where('mode', '!=', 'inherit')->whereBetween('expires_at', [now(), now()->addDays(30)])
            ->orderBy('expires_at')->limit(25)->get();

        return Inertia::render('Central/Features/Overrides', [
            'tenants' => $tenants,
            'selectedTenant' => $tenant,
            'rows' => $rows,
            'expiring' => $expiring,
            'filters' => $request->only('tenant_id'),
        ]);
    }

    public function update(Request $request, Tenant $tenant, Feature $feature, CentralAuditService $audit)
    {
        $data = $request->validate([
            'mode' => ['required', Rule::in(['inherit', 'enable', 'disable', 'custom_limit'])],
            'value' => ['nullable'],
            'reason' => ['required_unless:mode,inherit', 'nullable', 'string', 'max:2000'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:starts_at'],
        ]);
        $data['value'] = $this->validatedValue($feature, $data['mode'], $data['value'] ?? null);
        $adminId = $request->user('central')->id;
        $override = TenantFeatureOverride::firstOrNew(['tenant_id' => $tenant->id, 'feature_id' => $feature->id]);
        $old = $override->exists ? $override->toArray() : [];
        $override->fill($data + ['enabled' => match ($data['mode']) {
            'enable' => true, 'disable' => false, default => null
        }, 'limit_value' => $feature->type === 'integer' && $data['mode'] === 'custom_limit' ? $data['value'] : null, 'updated_by' => $adminId]);
        $override->created_by ??= $adminId;
        $override->save();
        $audit->log($request, 'feature_override.updated', $override, $old, $override->fresh()->toArray());

        return back()->with('success', 'Feature override saved.');
    }

    public function destroy(Request $request, Tenant $tenant, Feature $feature, CentralAuditService $audit)
    {
        $override = TenantFeatureOverride::where('tenant_id', $tenant->id)->where('feature_id', $feature->id)->firstOrFail();
        $old = $override->toArray();
        $override->update(['mode' => 'inherit', 'enabled' => null, 'value' => null, 'limit_value' => null, 'reason' => null, 'starts_at' => null, 'expires_at' => null, 'updated_by' => $request->user('central')->id]);
        $audit->log($request, 'feature_override.reset', $override, $old, $override->fresh()->toArray());

        return back()->with('success', 'Override reset to the plan value.');
    }

    public function history(Tenant $tenant, Feature $feature)
    {
        $override = TenantFeatureOverride::where('tenant_id', $tenant->id)->where('feature_id', $feature->id)->first();
        if (! $override) {
            return response()->json([]);
        }

        return response()->json(CentralAuditLog::where('model_type', $override->getMorphClass())->where('model_id', $override->id)->latest('id')->limit(50)->get());
    }

    private function validatedValue(Feature $feature, string $mode, mixed $value): mixed
    {
        if ($mode !== 'custom_limit') {
            return null;
        }

        return match ($feature->type) {
            'integer' => filter_var($value, FILTER_VALIDATE_INT) !== false && (int) $value >= 0 ? (int) $value : abort(422, 'Enter a non-negative whole number.'),
            'decimal' => is_numeric($value) ? (float) $value : abort(422, 'Enter a numeric value.'),
            'json' => is_array($value) ? $value : (json_decode((string) $value, true) ?? abort(422, 'Enter valid JSON.')),
            default => is_scalar($value) ? (string) $value : abort(422, 'Enter a valid value.'),
        };
    }
}
