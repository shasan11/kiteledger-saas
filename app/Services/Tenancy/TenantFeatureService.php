<?php

namespace App\Services\Tenancy;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TenantFeatureService
{
    public function allowed(Tenant $tenant, string $key): bool
    {
        $resolved = $this->resolve($tenant, $key);

        return (bool) ($resolved['enabled'] ?? false);
    }

    public function limit(Tenant $tenant, string $key): ?int
    {
        $value = $this->resolve($tenant, $key)['limit'] ?? null;

        return $value === null ? null : (int) $value;
    }

    private function resolve(Tenant $tenant, string $key): array
    {
        $connection = config('tenancy.database.central_connection');
        if (! Schema::connection($connection)->hasTable('features')) {
            return ['enabled' => false, 'limit' => null];
        }

        $feature = DB::connection($connection)->table('features')->where('key', $key)->where('is_active', true)->first();
        if (! $feature) return ['enabled' => false, 'limit' => null];

        $override = DB::connection($connection)->table('tenant_feature_overrides')
            ->where('tenant_id', $tenant->getTenantKey())->where('feature_id', $feature->id)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->first();
        $plan = DB::connection($connection)->table('plan_feature')
            ->where('plan_id', $tenant->plan_id)->where('feature_id', $feature->id)->first();

        return [
            'enabled' => $override?->enabled ?? $plan?->enabled ?? false,
            'limit' => $override?->limit_value ?? $plan?->limit_value,
        ];
    }
}
