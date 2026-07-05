<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\PaymentGateway;
use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use App\Services\SaaS\PlanLimitService;
use App\Services\SaaS\TenantDomainService;
use App\Services\SaaS\TenantProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CentralTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_service_creates_tenant_and_domain_without_branch_confusion(): void
    {
        Queue::fake();
        $tenant = app(TenantProvisioningService::class)->create(['company_name' => 'Acme', 'owner_name' => 'Ada Owner', 'owner_email' => 'ada@example.test', 'timezone' => 'UTC', 'currency' => 'USD', 'subdomain' => 'acme', 'owner_password' => 'VerySecure!123']);
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'company_name' => 'Acme', 'status' => 'pending']);
        $this->assertDatabaseHas('domains', ['tenant_id' => $tenant->id, 'domain' => 'acme.test', 'type' => 'subdomain']);
        $this->assertSame('kiteledger_tenant_'.str_replace('-', '', $tenant->id), $tenant->database_name);
    }

    public function test_reserved_subdomains_are_rejected(): void
    {
        $this->expectException(ValidationException::class);
        app(TenantDomainService::class)->normalizeSubdomain('admin');
    }

    public function test_gateway_secrets_are_encrypted_at_rest(): void
    {
        $gateway = PaymentGateway::create(['name' => 'Stripe', 'slug' => 'stripe', 'secret_key' => 'sk_test_secret', 'webhook_secret' => 'whsec_secret']);
        $raw = $gateway->getRawOriginal('secret_key');
        $this->assertNotSame('sk_test_secret', $raw);
        $this->assertSame('sk_test_secret', Crypt::decryptString($raw));
        $this->assertArrayNotHasKey('secret_key', $gateway->toArray());
    }

    public function test_plan_feature_is_enforced_by_backend_service(): void
    {
        $plan = Plan::create(['name' => 'Starter', 'slug' => 'starter', 'currency' => 'USD', 'allow_pos' => false, 'allow_inventory' => true]);
        $tenant = Tenant::create(['company_name' => 'Acme', 'owner_name' => 'Owner', 'owner_email' => 'owner@example.test', 'plan_id' => $plan->id, 'status' => 'active']);
        $limits = app(PlanLimitService::class);
        $this->assertFalse($limits->allows($tenant, 'pos'));
        $this->assertTrue($limits->allows($tenant, 'inventory'));
    }

    public function test_central_domain_serves_central_website_and_does_not_initialize_tenant(): void
    {
        $response = $this->withHeader('Host', 'central.test')->get('/');
        $this->assertContains($response->getStatusCode(), [200, 302]); // installer redirects are valid before installation
        $this->assertNull(tenant());
    }
}
