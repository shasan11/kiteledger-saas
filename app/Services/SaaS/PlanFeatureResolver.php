<?php

namespace App\Services\SaaS;

use App\Contracts\SaaS\FeatureResolver;
use App\Models\Central\Tenant;

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
}
