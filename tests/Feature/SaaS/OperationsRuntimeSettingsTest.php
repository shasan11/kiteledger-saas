<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\CentralAdmin;
use App\Models\Central\Plan;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\SubscriptionService;
use Database\Seeders\PlatformSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class OperationsRuntimeSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_and_scheduler_switches_update_without_a_cache_delay(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $settings = app(PlatformSettingsService::class);

        $settings->updateSection('queue_scheduler', [
            'queue_scheduler.queue_enabled' => false,
            'queue_scheduler.scheduler_enabled' => false,
        ]);

        $this->assertFalse($settings->get('queue_scheduler.queue_enabled', true));
        $this->assertFalse($settings->get('queue_scheduler.scheduler_enabled', true));
    }

    public function test_operations_guide_is_available_to_central_administrators(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $admin = CentralAdmin::create(['name' => 'Owner', 'email' => 'operations@example.test', 'password' => bcrypt('correct-password'), 'role' => 'super_admin', 'is_active' => true]);

        $this->actingAs($admin, 'central')->get(route('central.settings.operations-guide'))->assertOk();
    }

    public function test_subscription_check_reactivates_a_due_timed_pause(): void
    {
        $plan = Plan::create(['name' => 'Operations', 'slug' => 'operations-runtime', 'currency' => 'USD']);
        $tenant = Tenant::create(['id' => 'runtime-customer', 'company_name' => 'Runtime Customer', 'owner_name' => 'Owner', 'owner_email' => 'owner@example.test', 'status' => 'active', 'plan_id' => $plan->id]);
        $subscription = Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'active', 'billing_cycle' => 'monthly', 'starts_at' => now()->subMonth(), 'current_period_starts_at' => now()->subDay(), 'current_period_ends_at' => now()->addMonth()]);

        app(SubscriptionService::class)->pause($subscription, now()->subMinute());
        Artisan::call('tenants:check-subscriptions');

        $this->assertSame('active', $subscription->refresh()->status);
        $this->assertNull($subscription->paused_at);
    }
}
