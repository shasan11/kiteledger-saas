<?php

namespace App\Services\SaaS;

use App\Contracts\SaaS\FeatureResolver;
use App\Models\Central\Feature;
use App\Models\Central\Tenant;
use App\Models\Central\TenantFeatureOverride;
use Illuminate\Support\Facades\Cache;

class PlanFeatureResolver implements FeatureResolver
{
    private const LEGACY = [
        'pos' => 'allow_pos', 'inventory' => 'allow_inventory', 'warehouses' => 'allow_warehouse',
        'hrm' => 'allow_hrm', 'payroll' => 'allow_hrm', 'crm' => 'allow_crm', 'ai' => 'allow_ai',
        'custom_domains' => 'allow_custom_domain', 'multi_branch' => 'allow_multi_branch',
        'api_access' => 'allow_api_access',
    ];

    public function allows(Tenant $tenant, string $feature): bool
    {
        return filter_var($this->value($tenant, $feature, false), FILTER_VALIDATE_BOOL);
    }

    public function value(Tenant $tenant, string $feature, mixed $default = null): mixed
    {
        $version = (int) Cache::get('feature-registry-version', 1);

        return Cache::remember("tenant-features:{$tenant->id}:{$feature}:{$version}", now()->addMinutes(30), fn () => $this->resolve($tenant, $feature, $default));
    }

    public function forgetTenant(Tenant|string $tenant): void
    {
        Cache::increment('feature-registry-version');
    }

    public function inheritedValue(Tenant $tenant, Feature $feature): mixed
    {
        $pivot = $tenant->plan?->plansFeatureRegistry()->where('features.id', $feature->id)->first()?->pivot;
        if ($pivot && ! $pivot->inherit_default) {
            return $this->typed($feature->type, $pivot->value ?? $pivot->limit_value ?? $pivot->enabled);
        }

        return $this->typed($feature->type, $feature->default_value);
    }

    public function effectiveSource(Tenant $tenant, Feature $feature): string
    {
        $override = TenantFeatureOverride::where('tenant_id', $tenant->id)->where('feature_id', $feature->id)
            ->where('mode', '!=', 'inherit')
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->exists();

        if ($override) {
            return 'tenant override';
        }

        $hasPlanValue = (bool) $tenant->plan?->plansFeatureRegistry()->where('features.id', $feature->id)->wherePivot('inherit_default', false)->exists();

        return $hasPlanValue ? 'plan' : 'global default';
    }

    private function resolve(Tenant $tenant, string $feature, mixed $default): mixed
    {
        $registry = Feature::where('key', $feature)->where('is_active', true)->first();
        if ($registry) {
            $override = TenantFeatureOverride::where('tenant_id', $tenant->id)->where('feature_id', $registry->id)
                ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->first();
            if ($override && $override->mode !== 'inherit') {
                return match ($override->mode) {
                    'enable' => true, 'disable' => false,
                    'custom_limit' => $this->typed($registry->type, $override->value ?? $override->limit_value),
                    default => $this->typed($registry->type, $override->value ?? $override->enabled),
                };
            }

            return $this->inheritedValue($tenant, $registry) ?? $default;
        }

        $plan = $tenant->plan;
        if (! $plan) {
            return $default;
        }

        $entry = $plan->features->firstWhere('feature_key', $feature);
        if ($entry) {
            return match ($entry->type) {
                'boolean' => filter_var($entry->value, FILTER_VALIDATE_BOOL),
                'integer' => (int) $entry->value,
                'decimal' => (float) $entry->value,
                'json' => json_decode((string) $entry->value, true),
                default => $entry->value,
            };
        }

        $column = self::LEGACY[$feature] ?? null;

        return $column ? (bool) $plan->{$column} : $default;
    }

    private function typed(string $type, mixed $value): mixed
    {
        if (is_string($value) && in_array($type, ['json', 'boolean'], true)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $value = $decoded;
            }
        }

        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOL), 'integer' => (int) $value,
            'decimal' => (float) $value, 'json' => is_array($value) ? $value : json_decode((string) $value, true),
            default => $value,
        };
    }
}
