<?php

namespace Database\Seeders;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use App\Models\Central\CentralUser;
use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use App\Services\SaaS\TenantMembershipService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Development data showing one platform account across two tenants.
 * Tenants are resolved by company name and only created when missing, so this
 * seeder never depends on a hard-coded tenant id existing.
 */
class PlatformUsersDemoSeeder extends Seeder
{
    private const TENANTS = [
        ['company_name' => 'Kuberbytes', 'role' => TenantMembershipRole::Owner, 'primary' => true],
        ['company_name' => 'Cortifox', 'role' => TenantMembershipRole::Administrator, 'primary' => false],
    ];

    public function run(): void
    {
        $user = CentralUser::firstOrCreate(
            ['email' => 'shasan@example.com'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Shasan Dhakal',
                'first_name' => 'Shasan',
                'last_name' => 'Dhakal',
                // Overridable so a deployment never has to ship with whatever
                // default is committed here.
                'password' => env('DEMO_PLATFORM_USER_PASSWORD', 'Balkot11@shasan'),
                'password_changed_at' => now(),
                'email_verified_at' => now(),
                'status' => PlatformUserStatus::Active->value,
                'is_active' => true,
            ],
        );
        $user->profile()->firstOrCreate([], ['job_title' => 'Chief Executive Officer', 'company' => 'Kuberbytes']);

        $memberships = app(TenantMembershipService::class);
        $planId = Plan::where('is_active', true)->orderBy('sort_order')->value('id');

        foreach (self::TENANTS as $definition) {
            $tenant = Tenant::where('company_name', $definition['company_name'])->first()
                ?: Tenant::create([
                    'id' => Str::slug($definition['company_name']),
                    'company_name' => $definition['company_name'],
                    'owner_name' => $user->name,
                    'owner_email' => $user->email,
                    'status' => 'pending',
                    'timezone' => 'UTC',
                    'currency' => env('SAAS_BILLING_CURRENCY', 'USD'),
                    'plan_id' => $planId,
                    'is_internal' => true,
                ]);

            if (! $user->tenantMemberships()->where('tenant_id', $tenant->getKey())->exists()) {
                $memberships->assign($user, $tenant, $definition['role'], [], null, $definition['primary']);
            }
        }
    }
}
