<?php

namespace Tests\Feature\SaaS;

use App\Contracts\SaaS\QuotaManager;
use App\Enums\TenantStatus;
use App\Http\Middleware\EnsureSubscriptionIsValid;
use App\Http\Middleware\InitializeTenancyByVerifiedDomain;
use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralPermission;
use App\Models\Central\CentralRole;
use App\Models\Central\Domain;
use App\Models\Central\PaymentGateway;
use App\Models\Central\Plan;
use App\Models\Central\PlanFeature;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use App\Services\Payments\StripeGatewayService;
use App\Services\SaaS\PlanFeatureResolver;
use App\Services\SaaS\TenantDomainService;
use App\Services\SaaS\TenantLifecycleService;
use App\Support\Installer\InstalledState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_domain_fails_closed(): void
    {
        InstalledState::mark();
        $tenant = Tenant::create(['id' => 'tenant-a', 'company_name' => 'A', 'owner_name' => 'A', 'owner_email' => 'a@test.invalid', 'status' => 'active']);
        Domain::create(['tenant_id' => $tenant->id, 'domain' => 'pending.test', 'status' => 'pending']);
        $request = Request::create('https://pending.test/api/brand', 'GET', server: ['HTTP_ACCEPT' => 'application/json']);
        $response = app(InitializeTenancyByVerifiedDomain::class)->handle($request, fn () => response('unsafe'));
        $this->assertSame(404, $response->getStatusCode());
        $this->assertNull(tenant());
    }

    public function test_missing_paid_subscription_returns_payment_required(): void
    {
        $plan = Plan::create(['name' => 'Paid', 'slug' => 'paid', 'price_monthly' => 10, 'price_yearly' => 100]);
        $tenant = Tenant::create(['id' => 'tenant-b', 'company_name' => 'B', 'owner_name' => 'B', 'owner_email' => 'b@test.invalid', 'status' => 'active', 'plan_id' => $plan->id]);
        tenancy()->initialize($tenant);
        $request = Request::create('/api/products', 'GET', server: ['HTTP_ACCEPT' => 'application/json']);
        $response = app(EnsureSubscriptionIsValid::class)->handle($request, fn () => response('unsafe'));
        $this->assertSame(402, $response->getStatusCode());
        tenancy()->end();
    }

    public function test_feature_rows_override_legacy_flags(): void
    {
        $plan = Plan::create(['name' => 'Plan', 'slug' => 'plan', 'allow_pos' => true]);
        PlanFeature::create(['plan_id' => $plan->id, 'feature_key' => 'pos', 'feature_name' => 'POS', 'type' => 'boolean', 'value' => 'false']);
        $tenant = Tenant::create(['id' => 'tenant-c', 'company_name' => 'C', 'owner_name' => 'C', 'owner_email' => 'c@test.invalid', 'status' => 'active', 'plan_id' => $plan->id]);
        $this->assertFalse(app(PlanFeatureResolver::class)->allows($tenant, 'pos'));
    }

    public function test_api_quota_reservations_are_atomic_and_releasable(): void
    {
        $plan = Plan::create(['name' => 'Limited', 'slug' => 'limited', 'max_api_requests_per_month' => 1]);
        $tenant = Tenant::create(['id' => 'tenant-d', 'company_name' => 'D', 'owner_name' => 'D', 'owner_email' => 'd@test.invalid', 'status' => 'active', 'plan_id' => $plan->id]);
        $quotas = app(QuotaManager::class);
        $reservation = $quotas->reserve($tenant, 'api_requests');
        try {
            $quotas->reserve($tenant, 'api_requests');
            $this->fail('Second reservation should fail.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }
        $quotas->release($reservation);
        $this->assertNotNull($quotas->reserve($tenant, 'api_requests'));
    }

    public function test_invalid_lifecycle_transition_is_rejected(): void
    {
        $tenant = Tenant::create(['id' => 'tenant-e', 'company_name' => 'E', 'owner_name' => 'E', 'owner_email' => 'e@test.invalid', 'status' => 'pending']);
        $this->expectException(ValidationException::class);
        app(TenantLifecycleService::class)->transition($tenant, TenantStatus::Active);
    }

    public function test_custom_domain_rejects_urls_and_addresses(): void
    {
        foreach (['https://example.com/path', '127.0.0.1', 'localhost', '*.example.com', 'example.com:443'] as $invalid) {
            try {
                app(TenantDomainService::class)->normalizeCustomDomain($invalid);
                $this->fail("{$invalid} should fail.");
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_central_role_permissions_are_server_side(): void
    {
        $admin = CentralAdmin::create(['name' => 'Operator', 'email' => 'operator@test.invalid', 'password' => 'hash', 'role' => 'operator']);
        $role = CentralRole::create(['name' => 'billing', 'label' => 'Billing']);
        $permission = CentralPermission::create(['name' => 'billing.manage', 'label' => 'Manage billing']);
        $role->permissions()->attach($permission);
        $admin->roles()->attach($role);
        $this->assertTrue($admin->can('billing.manage'));
        $this->assertFalse($admin->can('tenant.delete'));
    }

    public function test_locked_invoice_rejects_financial_mutation(): void
    {
        $tenant = Tenant::create(['id' => 'tenant-f', 'company_name' => 'F', 'owner_name' => 'F', 'owner_email' => 'f@test.invalid', 'status' => 'active']);
        $invoice = TenantInvoice::create(['invoice_number' => 'KL-LOCKED', 'tenant_id' => $tenant->id, 'subtotal' => 10, 'total' => 10, 'currency' => 'USD', 'status' => 'issued', 'locked_at' => now()]);
        $this->expectException(\LogicException::class);
        $invoice->update(['total' => 11]);
    }

    public function test_stripe_webhook_rejects_replay_window_and_accepts_valid_signature(): void
    {
        $gateway = PaymentGateway::create(['name' => 'Stripe', 'slug' => 'stripe', 'is_active' => true, 'secret_key' => 'sk_test', 'webhook_secret' => 'whsec_test']);
        $service = new StripeGatewayService($gateway);
        $raw = '{"id":"evt_1"}';
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, 'whsec_test');
        $this->assertTrue($service->verifyWebhook([], ['stripe-signature' => "t={$timestamp},v1={$signature}", 'raw_body' => $raw]));
        $old = $timestamp - 600;
        $oldSignature = hash_hmac('sha256', $old.'.'.$raw, 'whsec_test');
        $this->assertFalse($service->verifyWebhook([], ['stripe-signature' => "t={$old},v1={$oldSignature}", 'raw_body' => $raw]));
    }
}
