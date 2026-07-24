<?php

namespace Tests\Feature\SaaS;

use App\Http\Controllers\Tenant\CentralSupportController;
use App\Models\Central\BlogCategory;
use App\Models\Central\BlogPost;
use App\Models\Central\BlogTag;
use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralNotification;
use App\Models\Central\CentralRole;
use App\Models\Central\Feature;
use App\Models\Central\PaymentTransaction;
use App\Models\Central\Plan;
use App\Models\Central\PlatformSetting;
use App\Models\Central\Subscription;
use App\Models\Central\SupportCategory;
use App\Models\Central\SupportTicketAttachment;
use App\Models\Central\Tenant;
use App\Models\Central\TenantFeatureOverride;
use App\Models\Central\TenantInvoice;
use App\Models\Central\WebsitePage;
use App\Services\SaaS\BillingInvoiceService;
use App\Services\SaaS\InvoiceFormatter;
use App\Services\SaaS\PlanFeatureResolver;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\SupportTicketService;
use Database\Seeders\CentralRolesAndPermissionsSeeder;
use Database\Seeders\PlatformSettingsSeeder;
use Database\Seeders\WebsiteSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class SuperadminRequirementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_generation_uses_configured_sequence_tax_due_date_and_idempotency(): void
    {
        $this->travelTo(now()->setDate(2026, 3, 4)->startOfDay());
        $settings = app(PlatformSettingsService::class);
        $settings->set('invoice_customization', 'invoice_customization.prefix', 'AC-', 'string');
        $settings->set('invoice_customization', 'invoice_customization.starting_number', 10, 'integer');
        $settings->set('invoice_customization', 'invoice_customization.minimum_digits', 4, 'integer');
        $settings->set('invoice_customization', 'invoice_customization.annual_reset', true, 'boolean');
        $settings->set('billing', 'billing.tax_enabled', true, 'boolean');
        $settings->set('billing', 'billing.tax_rate', 10, 'decimal');
        $settings->set('billing', 'billing.prices_include_tax', false, 'boolean');
        $settings->set('billing', 'billing.invoice_due_days', 21, 'integer');
        $settings->set('billing', 'billing.default_invoice_notes', 'Thank you for your business.', 'string');
        [$subscription] = $this->subscription(100);

        $service = app(BillingInvoiceService::class);
        $first = $service->generate($subscription, 'invoice-key-one');
        $same = $service->generate($subscription, 'invoice-key-one');
        $second = $service->generate($subscription, 'invoice-key-two');

        $this->assertSame($first->id, $same->id);
        $this->assertSame('AC-2026-0010', $first->invoice_number);
        $this->assertSame('AC-2026-0011', $second->invoice_number);
        $this->assertEquals(100.0, $first->subtotal);
        $this->assertEquals(10.0, $first->tax);
        $this->assertEquals(110.0, $first->total);
        $this->assertTrue($first->due_date->isSameDay(today()->addDays(21)));
        $this->assertSame('Thank you for your business.', $first->notes);
        $this->assertDatabaseHas('invoice_number_sequences', ['period' => '2026', 'last_number' => 11]);
    }

    public function test_manual_refunds_are_idempotent_and_never_double_count(): void
    {
        $admin = $this->admin('refunds@example.test');
        $settings = app(PlatformSettingsService::class);
        $settings->set('billing', 'billing.refunds', true, 'boolean');
        $settings->set('billing', 'billing.maximum_refund_period', 90, 'integer');
        $settings->set('security', 'security.require_mfa_for_refunds', false, 'boolean');
        [, $tenant] = $this->subscription(100);
        $invoice = TenantInvoice::create(['invoice_number' => 'REF-001', 'tenant_id' => $tenant->id, 'subtotal' => 100, 'total' => 100, 'paid_amount' => 100, 'balance' => 0, 'currency' => 'USD', 'status' => 'paid']);
        $payment = PaymentTransaction::create(['tenant_id' => $tenant->id, 'invoice_id' => $invoice->id, 'gateway' => 'manual', 'amount' => 100, 'currency' => 'USD', 'status' => 'success', 'refunded_amount' => 0, 'paid_at' => now(), 'reference' => 'MANUAL-REFUND']);
        $payload = ['amount' => 40, 'reason' => 'Customer requested a partial refund.', 'current_password' => 'correct-password', 'idempotency_key' => 'refund-request-1'];

        $this->actingAs($admin, 'central')->post(route('central.payments.refund', $payment), $payload)->assertRedirect();
        $this->actingAs($admin, 'central')->post(route('central.payments.refund', $payment), $payload)->assertRedirect();

        $this->assertDatabaseCount('payment_refunds', 1);
        $this->assertEquals(40.0, $payment->refresh()->refunded_amount);
        $this->assertSame('success', $payment->status);
        $this->assertDatabaseHas('central_audit_logs', ['action' => 'payment.refunded']);

        $this->actingAs($admin, 'central')->post(route('central.payments.refund', $payment), array_merge($payload, ['amount' => 60, 'idempotency_key' => 'refund-request-2']))->assertRedirect();
        $this->assertEquals(100.0, $payment->refresh()->refunded_amount);
        $this->assertSame('refunded', $payment->status);
    }

    public function test_manual_payment_endpoint_recalculates_invoice_and_creates_audit_and_notification(): void
    {
        $admin = $this->admin('manual-payment@example.test');
        $settings = app(PlatformSettingsService::class);
        $settings->set('billing', 'billing.partial_payments_enabled', true, 'boolean');
        $settings->set('billing', 'billing.overpayments_enabled', false, 'boolean');
        [, $tenant] = $this->subscription(100);
        $invoice = TenantInvoice::create(['invoice_number' => 'MANUAL-001', 'tenant_id' => $tenant->id, 'subtotal' => 100, 'total' => 100, 'paid_amount' => 0, 'balance' => 100, 'currency' => 'USD', 'status' => 'unpaid']);
        $payload = [
            'tenant_id' => $tenant->id, 'invoice_id' => $invoice->id, 'amount' => 100, 'currency' => 'USD',
            'payment_date' => now()->toDateTimeString(), 'payment_method' => 'bank_transfer', 'reference' => 'BANK-PAID-001',
            'send_receipt' => false, 'idempotency_key' => (string) Str::uuid(),
        ];

        $this->actingAs($admin, 'central')->post(route('central.payments.manual.store'), $payload)->assertRedirect(route('central.payments.index'));
        $this->assertSame('paid', $invoice->refresh()->status);
        $this->assertEquals(0.0, $invoice->balance);
        $this->assertDatabaseHas('central_audit_logs', ['action' => 'payment.manual_recorded']);
        $this->assertDatabaseHas('central_notifications', ['type' => 'manual_payment_recorded']);
    }

    public function test_setting_definitions_have_options_validation_and_preserve_values_when_reseeded(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $timezone = PlatformSetting::where('key', 'general.default_timezone')->firstOrFail();
        $email = PlatformSetting::where('key', 'company.email')->firstOrFail();
        $this->assertNotEmpty($timezone->options);
        $this->assertStringContainsString('email', $email->validation_rules);

        $name = PlatformSetting::where('key', 'general.platform_name')->firstOrFail();
        $name->value = 'Customer-controlled name';
        $name->save();
        $this->seed(PlatformSettingsSeeder::class);
        $this->assertSame('Customer-controlled name', $name->fresh()->value);

        $this->expectException(ValidationException::class);
        app(PlatformSettingsService::class)->updateSection('company', ['company.email' => 'not-an-email']);
    }

    public function test_public_pages_posts_and_sitemap_exclude_future_content(): void
    {
        $settings = app(PlatformSettingsService::class);
        $settings->set('seo', 'seo.sitemap_enabled', true, 'boolean');
        $settings->set('seo', 'seo.canonical_base_url', 'https://kiteledger.example', 'string');
        foreach (['seo.include_pages', 'seo.include_posts', 'seo.include_categories', 'seo.include_tags'] as $key) {
            $settings->set('seo', $key, true, 'boolean');
        }
        WebsitePage::create(['title' => 'Public page', 'slug' => 'public-page', 'page_type' => 'custom', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()->subMinute(), 'sitemap_include' => true, 'sitemap_priority' => 0.8, 'sitemap_change_frequency' => 'monthly']);
        WebsitePage::create(['title' => 'Future page', 'slug' => 'future-page', 'page_type' => 'custom', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()->addDay(), 'sitemap_include' => true, 'sitemap_priority' => 0.8, 'sitemap_change_frequency' => 'monthly']);
        BlogPost::create(['title' => 'Visible post', 'slug' => 'visible-post', 'content' => '<p>Visible</p>', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()->subMinute(), 'sitemap_include' => true, 'sitemap_priority' => 0.7]);
        BlogPost::create(['title' => 'Scheduled post', 'slug' => 'scheduled-post', 'content' => '<p>Later</p>', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()->addDay(), 'sitemap_include' => true, 'sitemap_priority' => 0.7]);

        $this->get(route('central.page', 'public-page'))->assertOk()->assertInertia(fn ($page) => $page->component('Central/Website/Page')->where('page.slug', 'public-page'));
        $this->get(route('central.page', 'future-page'))->assertNotFound();
        $this->get(route('central.blog.post', 'scheduled-post'))->assertNotFound();
        $sitemap = $this->get(route('central.sitemap'))->assertOk()->getContent();
        $this->assertStringContainsString('/public-page', $sitemap);
        $this->assertStringContainsString('/blog/visible-post', $sitemap);
        $this->assertStringNotContainsString('future-page', $sitemap);
        $this->assertStringNotContainsString('scheduled-post', $sitemap);
    }

    public function test_blog_admin_workflow_covers_drafts_scheduling_taxonomies_uniqueness_and_public_seo(): void
    {
        $admin = $this->admin('blog-workflow@example.test');
        $category = BlogCategory::create(['name' => 'Guides', 'slug' => 'guides', 'status' => 'active']);
        $tag = BlogTag::create(['name' => 'Accounting', 'slug' => 'accounting', 'status' => 'active']);
        $payload = [
            'title' => 'Reliable accounting guide', 'slug' => 'reliable-accounting-guide', 'excerpt' => 'A concise guide.',
            'content' => '<p onclick="evil()">Safe content</p><script>evil()</script>', 'status' => 'draft', 'visibility' => 'public',
            'is_featured' => false, 'category_ids' => [$category->id], 'tag_ids' => [$tag->id],
            'seo_title' => 'Reliable accounting SEO title', 'meta_description' => 'Search description for the accounting guide.',
            'focus_keyword' => 'accounting guide', 'robots_index' => true, 'robots_follow' => true,
            'sitemap_include' => true, 'sitemap_priority' => 0.7,
        ];

        $this->actingAs($admin, 'central')->post(route('central.blog.store'), $payload)->assertRedirect();
        $post = BlogPost::where('slug', $payload['slug'])->firstOrFail();
        $this->assertSame('draft', $post->status);
        $this->assertCount(1, $post->categories);
        $this->assertCount(1, $post->tags);
        $this->assertStringNotContainsString('script', $post->content);
        $this->assertStringNotContainsString('onclick', $post->content);
        $this->actingAs($admin, 'central')->get(route('central.blog.edit', $post))->assertOk();
        $this->actingAs($admin, 'central')->post(route('central.blog.store'), $payload + ['title' => 'Duplicate'])->assertSessionHasErrors('slug');

        $scheduled = array_merge($payload, ['title' => 'Scheduled guide', 'status' => 'scheduled', 'scheduled_at' => now()->addDay()->toDateTimeString()]);
        $this->actingAs($admin, 'central')->put(route('central.blog.update', $post), $scheduled)->assertRedirect();
        $this->assertSame('scheduled', $post->refresh()->status);
        $this->get(route('central.blog.post', $post->slug))->assertNotFound();

        $published = array_merge($payload, ['title' => 'Published guide', 'status' => 'published', 'published_at' => now()->subMinute()->toDateTimeString()]);
        $this->actingAs($admin, 'central')->put(route('central.blog.update', $post), $published)->assertRedirect();
        $this->get(route('central.blog.post', $post->slug))->assertOk()->assertInertia(fn ($page) => $page
            ->component('Central/Website/Post')
            ->where('post.seo_title', 'Reliable accounting SEO title')
            ->where('post.meta_description', 'Search description for the accounting guide.')
            ->where('post.categories.0.slug', 'guides')
            ->where('post.tags.0.slug', 'accounting'));
        $this->assertDatabaseHas('central_audit_logs', ['action' => 'blog.updated']);
    }

    public function test_seeded_homepage_menus_and_robots_render_while_drafts_remain_hidden(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $this->seed(WebsiteSeeder::class);
        WebsitePage::create(['title' => 'Hidden draft', 'slug' => 'hidden-draft', 'page_type' => 'custom', 'status' => 'draft', 'visibility' => 'public']);

        $this->get(route('central.home'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('Central/Website/Page')
            ->where('page.page_type', 'home')
            ->has('menus.header'));
        $this->get(route('central.page', 'hidden-draft'))->assertNotFound();
        $this->get(route('central.robots'))->assertOk()->assertHeader('Content-Type', 'text/plain; charset=UTF-8')->assertSee('User-agent: *', false);
    }

    public function test_support_configuration_sanitizes_replies_applies_defaults_and_honors_attachment_settings(): void
    {
        $admin = $this->admin('support@example.test');
        $this->actingAs($admin, 'central')->post(route('central.support-categories.store'), [
            'name' => 'Technical help', 'slug' => '', 'description' => 'Product incidents', 'default_priority' => 'high',
            'default_assignee_id' => $admin->id, 'is_active' => true, 'sort_order' => 2,
        ])->assertRedirect();
        $category = SupportCategory::where('slug', 'technical-help')->firstOrFail();
        $this->actingAs($admin, 'central')->post(route('central.saved-replies.store'), [
            'title' => 'Investigating', 'body' => '<p onclick="evil()">We are investigating.</p><script>evil()</script>', 'category_id' => $category->id, 'is_active' => true,
        ])->assertRedirect();
        $reply = app('db')->connection(config('tenancy.database.central_connection'))->table('support_saved_replies')->first();
        $this->assertStringNotContainsString('script', $reply->body);
        $this->assertStringNotContainsString('onclick', $reply->body);

        $tenant = Tenant::create(['id' => (string) Str::uuid(), 'company_name' => 'Support tenant', 'owner_name' => 'Owner', 'owner_email' => 'support-owner@example.test', 'status' => 'active']);
        $ticket = app(SupportTicketService::class)->create(['tenant_id' => $tenant->id, 'category_id' => $category->id, 'requester_name' => 'Owner', 'requester_email' => 'support-owner@example.test', 'subject' => 'Broken report', 'description' => 'Details']);
        $this->assertSame('high', $ticket->priority);
        $this->assertSame($admin->id, $ticket->assigned_admin_id);

        $settings = app(PlatformSettingsService::class);
        $settings->set('support', 'support.attachments_allowed', true, 'boolean');
        $settings->set('support', 'support.maximum_attachment_size', 2048, 'integer');
        $settings->set('support', 'support.allowed_attachment_types', ['pdf'], 'json');
        $rules = app(SupportTicketService::class)->attachmentValidationRules();
        $this->assertContains('mimes:pdf', $rules['attachments.*']);
        $this->assertContains('max:2048', $rules['attachments.*']);
        $settings->set('support', 'support.attachments_allowed', false, 'boolean');
        $this->assertSame(['prohibited'], app(SupportTicketService::class)->attachmentValidationRules()['attachments']);
    }

    public function test_notifications_can_only_be_changed_by_their_owner(): void
    {
        $first = $this->admin('first-notify@example.test');
        $second = $this->admin('second-notify@example.test');
        $own = CentralNotification::create(['admin_id' => $first->id, 'type' => 'test', 'category' => 'system', 'severity' => 'info', 'title' => 'Own', 'message' => 'Owned notification']);
        $other = CentralNotification::create(['admin_id' => $second->id, 'type' => 'test', 'category' => 'system', 'severity' => 'info', 'title' => 'Other', 'message' => 'Other notification']);

        $this->actingAs($first, 'central')->get(route('central.notifications.index'))->assertOk()->assertInertia(fn ($page) => $page->where('centralNotifications.unread', 1));
        $this->actingAs($first, 'central')->post(route('central.notifications.read', $other))->assertForbidden();
        $this->actingAs($first, 'central')->post(route('central.notifications.read', $own))->assertRedirect();
        $this->assertNotNull($own->fresh()->read_at);
        $this->assertNull($other->fresh()->read_at);
        $this->actingAs($second, 'central')->post(route('central.notifications.read-all'))->assertRedirect();
        $this->assertNotNull($other->fresh()->read_at);
    }

    public function test_ticket_lifecycle_enforces_isolation_assignment_sla_replies_and_attachment_authorization(): void
    {
        $admin = $this->admin('ticket-admin@example.test');
        $firstTenant = Tenant::create(['id' => 'ticket-tenant-a', 'company_name' => 'Tenant A', 'owner_name' => 'Owner A', 'owner_email' => 'a@example.test', 'status' => 'active']);
        $secondTenant = Tenant::create(['id' => 'ticket-tenant-b', 'company_name' => 'Tenant B', 'owner_name' => 'Owner B', 'owner_email' => 'b@example.test', 'status' => 'active']);
        $category = SupportCategory::create(['name' => 'Access', 'slug' => 'access', 'default_priority' => 'normal', 'default_assignee_id' => $admin->id, 'is_active' => true]);
        $settings = app(PlatformSettingsService::class);
        $settings->set('support', 'support.first_response_sla', 4, 'integer');
        $settings->set('support', 'support.resolution_sla', 24, 'integer');
        $service = app(SupportTicketService::class);
        $first = $service->create(['tenant_id' => $firstTenant->id, 'category_id' => $category->id, 'requester_user_id' => 10, 'requester_name' => 'Owner A', 'requester_email' => 'a@example.test', 'subject' => 'Cannot sign in', 'description' => 'Authentication fails', 'actor_type' => 'tenant', 'actor_id' => 10]);
        $second = $service->create(['tenant_id' => $secondTenant->id, 'category_id' => $category->id, 'requester_user_id' => 20, 'requester_name' => 'Owner B', 'requester_email' => 'b@example.test', 'subject' => 'Other ticket', 'description' => 'Other details', 'actor_type' => 'tenant', 'actor_id' => 20]);

        $this->assertSame($admin->id, $first->assigned_admin_id);
        $this->assertTrue($first->first_response_due_at->between(now()->addHours(3)->addMinutes(59), now()->addHours(4)->addMinute()));
        $this->assertTrue($first->resolution_due_at->between(now()->addHours(23)->addMinutes(59), now()->addHours(24)->addMinute()));
        $service->reply($first, ['sender_type' => 'tenant', 'sender_id' => 10, 'sender_name' => 'Owner A', 'sender_email' => 'a@example.test', 'body' => '<p>Tenant follow-up</p>']);
        $service->reply($first, ['sender_type' => 'admin', 'sender_id' => $admin->id, 'sender_name' => $admin->name, 'sender_email' => $admin->email, 'body' => '<p>Administrator reply</p>']);
        $this->assertNotNull($first->fresh()->first_response_at);
        $this->assertDatabaseCount('central_support_ticket_messages', 2);
        $first->update(['first_response_at' => null, 'first_response_due_at' => now()->subMinute()]);
        $this->assertSame(1, $service->markBreaches());
        $this->assertNotNull($first->fresh()->sla_breached_at);
        $service->transition($first, ['status' => 'closed'], 'admin', $admin->id);
        $this->assertNotNull($first->fresh()->closed_at);
        $service->transition($first, ['status' => 'open'], 'tenant', 10);
        $this->assertNull($first->fresh()->closed_at);

        $attachment = SupportTicketAttachment::create(['ticket_id' => $second->id, 'disk' => 'local', 'path' => 'central/support/missing.pdf', 'original_filename' => 'private.pdf', 'mime_type' => 'application/pdf', 'size' => 120, 'uploader_type' => 'tenant', 'uploader_id' => 20]);
        tenancy()->initialize($firstTenant);
        try {
            $request = Request::create('/support/tickets/'.$second->id, 'GET');
            try {
                app(CentralSupportController::class)->show($request, $second);
                $this->fail('A tenant accessed another tenant ticket.');
            } catch (HttpException $exception) {
                $this->assertSame(404, $exception->getStatusCode());
            }
            try {
                app(CentralSupportController::class)->download($request, $attachment);
                $this->fail('A tenant downloaded another tenant attachment.');
            } catch (HttpException $exception) {
                $this->assertSame(404, $exception->getStatusCode());
            }
        } finally {
            tenancy()->end();
        }
        $this->assertGreaterThanOrEqual(3, CentralNotification::count());
    }

    public function test_seeded_role_boundaries_block_cross_function_actions(): void
    {
        $this->seed(CentralRolesAndPermissionsSeeder::class);
        $support = $this->adminWithRole('support_agent', 'support-role@example.test');
        $billing = $this->adminWithRole('billing_administrator', 'billing-role@example.test');
        $content = $this->adminWithRole('content_manager', 'content-role@example.test');
        $auditor = $this->adminWithRole('read_only_auditor', 'auditor-role@example.test');

        $this->assertFalse($support->can('payment.refund'));
        $this->assertFalse($billing->can('cms.manage'));
        $this->assertFalse($content->can('payment.refund'));
        $this->assertFalse($auditor->can('support.manage'));
        $this->assertTrue($support->can('ticket.reply'));
        $this->assertTrue($billing->can('payment.refund'));
        $this->assertTrue($content->can('blog.manage'));
        $this->assertTrue($auditor->can('audit.view'));
    }

    public function test_feature_overrides_cover_inheritance_enable_disable_custom_expiration_and_cache_refresh(): void
    {
        $plan = Plan::create(['name' => 'Feature plan', 'slug' => 'feature-plan-full', 'currency' => 'USD']);
        $tenant = Tenant::create(['id' => 'feature-requirements', 'company_name' => 'Feature tenant', 'owner_name' => 'Owner', 'owner_email' => 'feature-requirements@example.test', 'status' => 'active', 'plan_id' => $plan->id]);
        $boolean = Feature::create(['key' => 'advanced_reports', 'name' => 'Advanced reports', 'type' => 'boolean', 'default_value' => false, 'is_active' => true]);
        $limit = Feature::create(['key' => 'branch_limit', 'name' => 'Branch limit', 'type' => 'integer', 'default_value' => 2, 'is_active' => true]);
        $plan->plansFeatureRegistry()->attach($boolean->id, ['enabled' => false, 'value' => 'false', 'inherit_default' => false]);
        $plan->plansFeatureRegistry()->attach($limit->id, ['enabled' => true, 'value' => '5', 'inherit_default' => false]);
        $resolver = app(PlanFeatureResolver::class);

        $this->assertFalse($resolver->allows($tenant, $boolean->key));
        $this->assertSame(5, $resolver->value($tenant, $limit->key));
        $override = TenantFeatureOverride::create(['tenant_id' => $tenant->id, 'feature_id' => $boolean->id, 'mode' => 'enable']);
        $this->assertTrue($resolver->allows($tenant, $boolean->key));
        $override->update(['mode' => 'disable']);
        $this->assertFalse($resolver->allows($tenant, $boolean->key));
        $custom = TenantFeatureOverride::create(['tenant_id' => $tenant->id, 'feature_id' => $limit->id, 'mode' => 'custom_limit', 'limit_value' => 12, 'expires_at' => now()->addHour()]);
        $this->assertSame(12, $resolver->value($tenant, $limit->key));
        $custom->update(['expires_at' => now()->subMinute()]);
        $this->assertSame(5, $resolver->value($tenant, $limit->key));
        $override->delete();
        $this->assertFalse($resolver->allows($tenant, $boolean->key));
    }

    public function test_invoice_formatter_supports_localized_numbers_and_safe_assets(): void
    {
        $formatter = app(InvoiceFormatter::class);
        $custom = ['invoice_customization' => ['number_format' => '1.234,56', 'currency_format' => 'symbol']];
        $this->assertSame('1.234,56', $formatter->number(1234.56, $custom));
        $this->assertSame('€1.234,56', $formatter->money(1234.56, 'EUR', $custom));
        $this->assertNull($formatter->localAsset('https://untrusted.example/logo.png'));
        $this->assertNull($formatter->localAsset('../../.env'));
    }

    private function subscription(float $price): array
    {
        $plan = Plan::create(['name' => 'Requirement plan '.Str::random(5), 'slug' => 'plan-'.Str::lower(Str::random(8)), 'currency' => 'USD', 'price_monthly' => $price, 'price_yearly' => $price * 10]);
        $tenant = Tenant::create(['id' => (string) Str::uuid(), 'company_name' => 'Requirement tenant', 'owner_name' => 'Owner', 'owner_email' => Str::uuid().'@example.test', 'status' => 'active', 'plan_id' => $plan->id]);
        $subscription = Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'active', 'billing_cycle' => 'monthly', 'current_period_starts_at' => now(), 'current_period_ends_at' => now()->addMonth()]);

        return [$subscription, $tenant, $plan];
    }

    private function admin(string $email): CentralAdmin
    {
        return CentralAdmin::create(['name' => 'Central Admin', 'email' => $email, 'password' => bcrypt('correct-password'), 'role' => 'super_admin', 'is_active' => true]);
    }

    private function adminWithRole(string $roleName, string $email): CentralAdmin
    {
        $admin = CentralAdmin::create(['name' => $roleName, 'email' => $email, 'password' => bcrypt('correct-password'), 'role' => 'operator', 'is_active' => true]);
        $admin->roles()->attach(CentralRole::where('name', $roleName)->firstOrFail());

        return $admin;
    }
}
