<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\CentralAdmin;
use App\Models\Central\Domain;
use App\Models\Central\Plan;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CentralTenantManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): CentralAdmin
    {
        return CentralAdmin::create([
            'name' => 'Owner', 'email' => 'tenant-admin@example.test',
            'password' => bcrypt('correct-password'), 'role' => 'super_admin', 'is_active' => true,
        ]);
    }

    private function tenant(?Plan $plan = null): Tenant
    {
        return Tenant::create([
            'id' => 'managed-tenant', 'company_name' => 'Managed Co', 'owner_name' => 'Owner',
            'owner_email' => 'owner@example.test', 'status' => 'active', 'timezone' => 'UTC',
            'currency' => 'USD', 'plan_id' => $plan?->id,
        ]);
    }

    private function plan(string $name = 'Starter', float $monthly = 29): Plan
    {
        return Plan::create([
            'name' => $name, 'slug' => strtolower($name), 'price_monthly' => $monthly,
            'price_yearly' => $monthly * 10, 'currency' => 'USD', 'is_active' => true, 'trial_days' => 0,
        ]);
    }

    public function test_owner_email_and_internal_flag_can_be_edited(): void
    {
        $tenant = $this->tenant($this->plan());

        $this->actingAs($this->admin(), 'central')
            ->put(route('central.tenants.update', $tenant), [
                'company_name' => 'Managed Co', 'owner_name' => 'New Owner',
                'owner_email' => 'changed@example.test', 'is_internal' => true,
                'status_reason' => 'VIP account', 'timezone' => 'UTC', 'currency' => 'USD',
                'plan_id' => $tenant->plan_id, 'tenancy_db_host' => '127.0.0.1', 'tenancy_db_port' => 3306,
                'tenancy_db_name' => 'tenant_managed', 'tenancy_db_username' => 'root',
            ])
            ->assertRedirect();

        $tenant->refresh();
        $this->assertSame('changed@example.test', $tenant->owner_email);
        $this->assertSame('New Owner', $tenant->owner_name);
        $this->assertTrue((bool) $tenant->is_internal);
        $this->assertSame('VIP account', $tenant->status_reason);
    }

    public function test_domains_can_be_added_promoted_and_removed(): void
    {
        config()->set('saas.tenant_base_domain', 'kiteledger.test');
        $admin = $this->admin();
        $tenant = $this->tenant();

        // First subdomain becomes primary automatically.
        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.domains.store', $tenant), ['type' => 'subdomain', 'value' => 'managed'])
            ->assertRedirect();

        $first = Domain::where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('managed.kiteledger.test', $first->domain);
        $this->assertTrue((bool) $first->is_primary);

        // A second subdomain, then promote it.
        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.domains.store', $tenant), ['type' => 'subdomain', 'value' => 'managed-two'])
            ->assertRedirect();

        $second = Domain::where('tenant_id', $tenant->id)->where('domain', 'managed-two.kiteledger.test')->firstOrFail();
        $this->assertFalse((bool) $second->is_primary);

        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.domains.primary', [$tenant, $second]))
            ->assertRedirect();

        $this->assertTrue((bool) $second->fresh()->is_primary);
        $this->assertFalse((bool) $first->fresh()->is_primary);

        // The primary one is protected; the demoted one can go.
        $this->actingAs($admin, 'central')
            ->delete(route('central.tenants.domains.destroy', [$tenant, $second]))
            ->assertStatus(422);

        $this->actingAs($admin, 'central')
            ->delete(route('central.tenants.domains.destroy', [$tenant, $first]))
            ->assertRedirect();

        $this->assertSame(1, Domain::where('tenant_id', $tenant->id)->count());

        // The last remaining domain cannot be removed either.
        $this->actingAs($admin, 'central')
            ->delete(route('central.tenants.domains.destroy', [$tenant, $second]))
            ->assertStatus(422);
    }

    public function test_a_custom_domain_starts_pending_and_cannot_be_stolen(): void
    {
        config()->set('saas.tenant_base_domain', 'kiteledger.test');
        $admin = $this->admin();
        $tenant = $this->tenant();
        $other = Tenant::create(['id' => 'other-tenant', 'company_name' => 'Other', 'owner_name' => 'O', 'owner_email' => 'o@example.test', 'status' => 'active']);
        $other->domains()->create(['domain' => 'books.example.com', 'type' => 'custom', 'status' => 'active']);

        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.domains.store', $tenant), ['type' => 'custom', 'value' => 'books.example.com'])
            ->assertStatus(422);

        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.domains.store', $tenant), ['type' => 'custom', 'value' => 'Ledger.Example.COM'])
            ->assertRedirect();

        $domain = Domain::where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('ledger.example.com', $domain->domain);
        $this->assertSame('pending', $domain->status);
        $this->assertNotEmpty($domain->verification_token);
    }

    public function test_a_subscription_can_be_started_and_its_plan_changed(): void
    {
        $admin = $this->admin();
        $starter = $this->plan('Starter');
        $growth = $this->plan('Growth', 79);
        $tenant = $this->tenant($starter);

        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.subscription.store', $tenant), [
                'plan_id' => $starter->id, 'billing_cycle' => 'monthly', 'mode' => 'active',
            ])
            ->assertRedirect();

        $subscription = Subscription::where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('active', $subscription->status);
        $this->assertTrue($subscription->isValid());

        // Starting a second one is refused.
        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.subscription.store', $tenant), [
                'plan_id' => $growth->id, 'billing_cycle' => 'monthly', 'mode' => 'active',
            ])
            ->assertStatus(409);

        // Scheduled change leaves the current plan in place.
        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.subscription.plan', $tenant), ['plan_id' => $growth->id])
            ->assertRedirect();

        $subscription->refresh();
        $this->assertSame($starter->id, (int) $subscription->plan_id);
        $this->assertSame($growth->id, (int) $subscription->scheduled_plan_id);

        // Immediate change swaps it now.
        $this->actingAs($admin, 'central')
            ->post(route('central.tenants.subscription.plan', $tenant), ['plan_id' => $growth->id, 'immediate' => true])
            ->assertRedirect();

        $this->assertSame($growth->id, (int) $subscription->fresh()->plan_id);
    }
}
