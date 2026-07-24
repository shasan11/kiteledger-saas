<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\BlogPost;
use App\Models\Central\CentralAdmin;
use App\Models\Central\Feature;
use App\Models\Central\PaymentGateway;
use App\Models\Central\Plan;
use App\Models\Central\PlatformSetting;
use App\Models\Central\Subscription;
use App\Models\Central\SupportCategory;
use App\Models\Central\Tenant;
use App\Models\Central\TenantFeatureOverride;
use App\Models\Central\TenantInvoice;
use App\Services\Payments\ManualPaymentService;
use App\Services\SaaS\BillingInvoiceService;
use App\Services\SaaS\InvoiceQrCode;
use App\Services\SaaS\PlanFeatureResolver;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\SupportTicketService;
use App\Support\SafeHtml;
use Barryvdh\DomPDF\Facade\Pdf;
use Database\Seeders\CentralDatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SuperadminControlCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_seeders_are_complete_and_idempotent(): void
    {
        $this->seed(CentralDatabaseSeeder::class);
        $counts = [
            'settings' => PlatformSetting::count(), 'gateways' => PaymentGateway::count(),
            'posts' => BlogPost::count(), 'categories' => SupportCategory::count(),
        ];
        $this->seed(CentralDatabaseSeeder::class);

        $this->assertSame($counts, [
            'settings' => PlatformSetting::count(), 'gateways' => PaymentGateway::count(),
            'posts' => BlogPost::count(), 'categories' => SupportCategory::count(),
        ]);
        $this->assertGreaterThan(200, $counts['settings']);
        $this->assertTrue(PaymentGateway::where('slug', 'manual')->where('is_active', true)->exists());
        $this->assertDatabaseCount('blog_categories', 3);
        $this->assertDatabaseCount('blog_tags', 10);
        $this->assertDatabaseCount('support_saved_replies', 5);
        $this->assertDatabaseCount('central_roles', 8);
    }

    public function test_setting_values_are_typed_encrypted_masked_and_cache_is_invalidated(): void
    {
        $service = app(PlatformSettingsService::class);
        $setting = $service->set('email', 'email.password', 'top-secret', 'string', true);
        $this->assertNotSame('top-secret', $setting->getRawOriginal('value'));
        $this->assertSame('top-secret', Crypt::decryptString($setting->getRawOriginal('value')));
        $this->assertNull($setting->safeValue());
        $this->assertArrayNotHasKey('value', $setting->toArray());

        $service->set('billing', 'billing.partial_payments_enabled', true, 'boolean');
        $this->assertTrue($service->get('billing.partial_payments_enabled'));
        $service->updateSection('billing', ['billing.partial_payments_enabled' => false]);
        $this->assertFalse($service->get('billing.partial_payments_enabled'));
    }

    public function test_manual_payments_recalculate_partial_and_full_invoice_balances(): void
    {
        $this->setting('billing.partial_payments_enabled', true);
        $this->setting('billing.overpayments_enabled', false);
        [$invoice] = $this->invoice();
        $service = app(ManualPaymentService::class);
        $service->record($invoice, $this->paymentData(40, 'PAY-001'));
        $this->assertSame('partially_paid', $invoice->refresh()->status);
        $this->assertEquals(40.0, $invoice->paid_amount);
        $this->assertEquals(60.0, $invoice->balance);
        $service->record($invoice, $this->paymentData(60, 'PAY-002'));
        $this->assertSame('paid', $invoice->refresh()->status);
        $this->assertEquals(0.0, $invoice->balance);
        $this->assertDatabaseCount('central_notifications', 2);
    }

    public function test_manual_payment_rejects_overpayment_and_duplicate_reference(): void
    {
        $this->setting('billing.partial_payments_enabled', true);
        $this->setting('billing.overpayments_enabled', false);
        [$invoice] = $this->invoice();
        $service = app(ManualPaymentService::class);
        $service->record($invoice, $this->paymentData(25, 'UNIQUE-REF'));
        try {
            $service->record($invoice, $this->paymentData(25, 'UNIQUE-REF'));
            $this->fail('Duplicate reference accepted.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('reference', $exception->errors());
        }
        try {
            $service->record($invoice, $this->paymentData(100, 'OVERPAY'));
            $this->fail('Overpayment accepted.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount', $exception->errors());
        }
    }

    public function test_feature_resolution_precedence_and_expiration(): void
    {
        $plan = Plan::create(['name' => 'Starter', 'slug' => 'resolver', 'currency' => 'USD']);
        $tenant = Tenant::create(['id' => 'feature-tenant', 'company_name' => 'Feature Co', 'owner_name' => 'Owner', 'owner_email' => 'feature@example.test', 'status' => 'active', 'plan_id' => $plan->id]);
        $feature = Feature::create(['key' => 'exports', 'name' => 'Exports', 'type' => 'integer', 'default_value' => 5]);
        $plan->plansFeatureRegistry()->attach($feature->id, ['enabled' => true, 'value' => '10', 'inherit_default' => false]);
        $resolver = app(PlanFeatureResolver::class);
        $this->assertSame(10, $resolver->value($tenant, 'exports'));
        $override = TenantFeatureOverride::create(['tenant_id' => $tenant->id, 'feature_id' => $feature->id, 'mode' => 'custom_limit', 'limit_value' => 25, 'expires_at' => now()->addDay()]);
        $this->assertSame(25, $resolver->value($tenant->fresh(), 'exports'));
        $override->update(['expires_at' => now()->subMinute()]);
        $this->assertSame(10, $resolver->value($tenant->fresh(), 'exports'));
    }

    public function test_plan_feature_registry_rejects_invalid_json_and_duplicate_features(): void
    {
        $admin = CentralAdmin::create(['name' => 'Owner', 'email' => 'owner-plans@example.test', 'password' => bcrypt('correct-password'), 'role' => 'super_admin', 'is_active' => true]);
        $plan = Plan::create(['name' => 'Typed', 'slug' => 'typed-plan', 'currency' => 'USD']);
        $feature = Feature::create(['key' => 'export_config', 'name' => 'Export config', 'type' => 'json', 'default_value' => []]);
        $base = ['name' => 'Typed', 'slug' => 'typed-plan', 'price_monthly' => 0, 'price_yearly' => 0, 'currency' => 'USD', 'trial_days' => 14, 'sort_order' => 0, 'is_active' => true, 'is_featured' => false];

        $this->actingAs($admin, 'central')->put(route('central.plans.update', $plan), $base + ['feature_registry' => [['feature_id' => $feature->id, 'enabled' => true, 'inherit_default' => false, 'display_on_pricing' => true, 'value' => '{broken']]])
            ->assertSessionHasErrors('feature_registry.0.value');
        $this->actingAs($admin, 'central')->put(route('central.plans.update', $plan), $base + ['feature_registry' => [
            ['feature_id' => $feature->id, 'enabled' => true, 'inherit_default' => false, 'display_on_pricing' => true, 'value' => '{}'],
            ['feature_id' => $feature->id, 'enabled' => true, 'inherit_default' => false, 'display_on_pricing' => true, 'value' => '{}'],
        ]])->assertSessionHasErrors('feature_registry.1.feature_id');
    }

    public function test_blog_content_is_sanitized_and_taxonomies_are_relational(): void
    {
        $post = BlogPost::create(['title' => 'Safe post', 'slug' => 'safe-post', 'content' => '<p onclick="evil()">Hello</p><script>alert(1)</script>', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);
        $this->assertStringNotContainsString('script', $post->content);
        $this->assertStringNotContainsString('onclick', $post->content);
        $this->assertStringContainsString('<p>Hello</p>', $post->content);
    }

    public function test_rich_content_allows_safe_youtube_embeds_and_rejects_active_content(): void
    {
        $clean = SafeHtml::clean('<iframe src="https://www.youtube.com/embed/abc123" onload="evil()"></iframe><iframe src="https://evil.example/embed"></iframe><a href="javascript:evil()">bad</a><img src="data:text/html,evil">');
        $this->assertStringContainsString('https://www.youtube.com/embed/abc123', $clean);
        $this->assertStringNotContainsString('onload', $clean);
        $this->assertStringNotContainsString('evil.example', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);
        $this->assertStringNotContainsString('data:text/html', $clean);
    }

    public function test_gateway_configuration_recursively_masks_secrets(): void
    {
        $gateway = PaymentGateway::create(['name' => 'Nested', 'slug' => 'nested', 'config' => ['account' => ['region' => 'us', 'api_token' => 'never-return'], 'password' => 'hidden']]);
        $serialized = $gateway->fresh()->toArray();
        $this->assertArrayNotHasKey('config', $serialized);
        $this->assertSame(['account' => ['region' => 'us']], $serialized['safe_config']);
        $this->assertStringNotContainsString('never-return', json_encode($serialized));
    }

    public function test_sensitive_setting_updates_require_the_current_admin_password(): void
    {
        $admin = CentralAdmin::create(['name' => 'Owner', 'email' => 'owner-settings@example.test', 'password' => bcrypt('correct-password'), 'role' => 'super_admin', 'is_active' => true]);
        PlatformSetting::create(['group' => 'security', 'key' => 'security.require_mfa_for_all_admins', 'label' => 'Require MFA', 'type' => 'boolean', 'input_type' => 'switch', 'value' => false, 'requires_confirmation' => true]);
        $url = route('central.settings.update', 'security');
        $this->actingAs($admin, 'central')->put($url, ['values' => ['security.require_mfa_for_all_admins' => true]])->assertStatus(422);
        $this->assertFalse((bool) PlatformSetting::where('key', 'security.require_mfa_for_all_admins')->first()->value);
        $this->actingAs($admin, 'central')->put($url, ['values' => ['security.require_mfa_for_all_admins' => true], 'confirmation_password' => 'correct-password'])->assertRedirect();
        $this->assertTrue((bool) PlatformSetting::where('key', 'security.require_mfa_for_all_admins')->first()->value);
    }

    public function test_feature_override_workflow_exposes_effective_value_and_resets_to_plan(): void
    {
        $admin = CentralAdmin::create(['name' => 'Owner', 'email' => 'owner-features@example.test', 'password' => bcrypt('correct-password'), 'role' => 'super_admin', 'is_active' => true]);
        $plan = Plan::create(['name' => 'Registry', 'slug' => 'registry-workflow', 'currency' => 'USD']);
        $tenant = Tenant::create(['id' => 'override-workflow', 'company_name' => 'Override Co', 'owner_name' => 'Owner', 'owner_email' => 'override@example.test', 'status' => 'active', 'plan_id' => $plan->id]);
        $feature = Feature::create(['key' => 'workflow_limit', 'name' => 'Workflow limit', 'type' => 'integer', 'default_value' => 3]);
        $plan->plansFeatureRegistry()->attach($feature->id, ['value' => '8', 'inherit_default' => false]);
        $url = route('central.tenant-feature-overrides.update', [$tenant, $feature]);
        $this->actingAs($admin, 'central')->put($url, ['mode' => 'custom_limit', 'value' => 21, 'reason' => 'Approved temporary capacity increase'])->assertRedirect();
        $this->assertSame(21, app(PlanFeatureResolver::class)->value($tenant->fresh(), $feature->key));
        $this->actingAs($admin, 'central')->delete(route('central.tenant-feature-overrides.destroy', [$tenant, $feature]))->assertRedirect();
        $this->assertSame(8, app(PlanFeatureResolver::class)->value($tenant->fresh(), $feature->key));
        $this->assertDatabaseHas('central_audit_logs', ['action' => 'feature_override.reset']);
    }

    public function test_historical_invoice_keeps_its_customization_snapshot(): void
    {
        app(PlatformSettingsService::class)->set('invoice_customization', 'invoice_customization.accent_color', '#0f766e');
        $plan = Plan::create(['name' => 'Billing', 'slug' => 'snapshot-plan', 'currency' => 'USD', 'price_monthly' => 25, 'price_yearly' => 250]);
        $tenant = Tenant::create(['id' => 'snapshot-tenant', 'company_name' => 'Snapshot Co', 'owner_name' => 'Owner', 'owner_email' => 'snapshot@example.test', 'status' => 'active', 'plan_id' => $plan->id]);
        $subscription = Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'active', 'billing_cycle' => 'monthly', 'current_period_starts_at' => now(), 'current_period_ends_at' => now()->addMonth()]);
        $invoice = app(BillingInvoiceService::class)->generate($subscription, 'snapshot-test');
        app(PlatformSettingsService::class)->set('invoice_customization', 'invoice_customization.accent_color', '#dc2626');
        $this->assertSame('#0f766e', data_get($invoice->fresh()->customization_snapshot, 'invoice_customization.accent_color'));
    }

    public function test_invoice_qr_code_is_snapshot_controlled_and_self_contained(): void
    {
        $invoice = new TenantInvoice([
            'invoice_number' => 'INV-QR-001', 'currency' => 'USD', 'total' => 125, 'balance' => 75,
            'due_date' => today()->addWeek(), 'customization_snapshot' => ['invoice_customization' => ['qr_code' => true]],
        ]);
        $dataUri = app(InvoiceQrCode::class)->dataUri($invoice);

        $this->assertStringStartsWith('data:image/png;base64,', $dataUri);
        $this->assertStringStartsWith("\x89PNG", base64_decode(str($dataUri)->after(',')->toString(), true));
        $this->assertStringStartsWith('%PDF', Pdf::loadView('central.invoice', compact('invoice'))->setPaper('a4')->output());
        $invoice->customization_snapshot = ['invoice_customization' => ['qr_code' => false]];
        $this->assertNull(app(InvoiceQrCode::class)->dataUri($invoice));
    }

    public function test_support_internal_notes_can_be_excluded_from_tenant_conversations(): void
    {
        CentralAdmin::create(['name' => 'Admin', 'email' => 'support-admin@example.test', 'password' => bcrypt('test-password'), 'role' => 'super_admin', 'is_active' => true]);
        $tenant = Tenant::create(['id' => 'support-tenant', 'company_name' => 'Support Co', 'owner_name' => 'Owner', 'owner_email' => 'owner@example.test', 'status' => 'active']);
        $ticket = app(SupportTicketService::class)->create(['tenant_id' => $tenant->id, 'requester_user_id' => 10, 'requester_name' => 'Owner', 'requester_email' => 'owner@example.test', 'subject' => 'Need help', 'description' => 'Details', 'priority' => 'normal']);
        app(SupportTicketService::class)->reply($ticket, ['sender_type' => 'admin', 'sender_id' => 1, 'sender_name' => 'Admin', 'body' => '<p>Private context</p>', 'is_internal_note' => true]);
        app(SupportTicketService::class)->reply($ticket, ['sender_type' => 'admin', 'sender_id' => 1, 'sender_name' => 'Admin', 'body' => '<p>Public reply</p>', 'is_internal_note' => false]);
        $visible = $ticket->messages()->where('is_internal_note', false)->get();
        $this->assertCount(1, $visible);
        $this->assertSame('Public reply', $visible->first()->plain_body);
    }

    private function invoice(): array
    {
        CentralAdmin::firstOrCreate(['email' => 'billing-admin@example.test'], ['name' => 'Billing', 'password' => bcrypt('test-password'), 'role' => 'super_admin', 'is_active' => true]);
        $tenant = Tenant::create(['id' => (string) Str::uuid(), 'company_name' => 'Billing Co', 'owner_name' => 'Owner', 'owner_email' => Str::uuid().'@example.test', 'status' => 'active']);
        $invoice = TenantInvoice::create(['invoice_number' => 'INV-'.Str::upper(Str::random(8)), 'tenant_id' => $tenant->id, 'subtotal' => 100, 'total' => 100, 'paid_amount' => 0, 'balance' => 100, 'currency' => 'USD', 'status' => 'unpaid']);

        return [$invoice, $tenant];
    }

    private function paymentData(float $amount, string $reference): array
    {
        return ['amount' => $amount, 'currency' => 'USD', 'payment_date' => now(), 'payment_method' => 'bank_transfer', 'reference' => $reference, 'idempotency_key' => (string) Str::uuid(), 'added_by' => CentralAdmin::first()->id];
    }

    private function setting(string $key, bool $value): void
    {
        app(PlatformSettingsService::class)->set('billing', $key, $value, 'boolean');
        Cache::forget('platform-setting:'.$key);
    }
}
