<?php

namespace App\Services\SaaS;

use App\Contracts\SaaS\FeatureResolver;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;

class PlanLimitService
{
    private const FLAGS = ['pos' => 'allow_pos', 'inventory' => 'allow_inventory', 'hrm' => 'allow_hrm', 'crm' => 'allow_crm', 'warehouse' => 'allow_warehouse', 'ai' => 'allow_ai', 'custom_domain' => 'allow_custom_domain', 'multi_branch' => 'allow_multi_branch', 'api_access' => 'allow_api_access'];

    private const LIMITS = ['users' => ['users', 'max_users'], 'branches' => ['branches', 'max_branches'], 'products' => ['products', 'max_products'], 'customers' => ['contacts', 'max_customers']];

    public function __construct(private FeatureResolver $features) {}

    public function allows(Tenant $tenant, string $feature): bool
    {
        return $this->features->allows($tenant, $feature);
    }

    public function canCreate(Tenant $tenant, string $resource): bool
    {
        [$table,$column] = self::LIMITS[$resource] ?? [null, null];
        $plan = $tenant->plan;
        if (! $table || ! $plan || $plan->{$column} === null) {
            return true;
        }

        return $tenant->run(fn () => DB::table($table)->count() < $plan->{$column});
    }

    public function assertFeature(Tenant $tenant, string $feature): void
    {
        abort_unless($this->allows($tenant, $feature), 403, 'Your plan does not include this feature.');
    }

    public function assertCanCreate(Tenant $tenant, string $resource): void
    {
        abort_unless($this->canCreate($tenant, $resource), 422, "Your {$resource} plan limit has been reached.");
    }
}
