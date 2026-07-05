<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_admin_users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('super_admin');
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('plans', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('price_monthly', 14, 2)->default(0);
            $table->decimal('price_yearly', 14, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->unsignedSmallInteger('trial_days')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            foreach (['max_users', 'max_branches', 'max_products', 'max_customers', 'max_invoices_per_month', 'max_storage_mb', 'max_ai_requests_per_month'] as $limit) {
                $table->unsignedBigInteger($limit)->nullable();
            }
            foreach (['allow_pos', 'allow_inventory', 'allow_hrm', 'allow_crm', 'allow_warehouse', 'allow_ai', 'allow_custom_domain', 'allow_multi_branch', 'allow_api_access'] as $flag) {
                $table->boolean($flag)->default(false);
            }
            $table->json('data')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('plan_features', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->string('feature_key');
            $table->string('feature_name');
            $table->text('description')->nullable();
            $table->text('value')->nullable();
            $table->string('type')->default('boolean');
            $table->boolean('is_visible_on_pricing_page')->default(true);
            $table->timestamps();
            $table->unique(['plan_id', 'feature_key']);
        });

        Schema::create('default_data_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('country', 2)->nullable();
            $table->string('industry')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('data')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('default_template_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('template_id')->constrained('default_data_templates')->cascadeOnDelete();
            $table->string('category');
            $table->string('key');
            $table->string('name');
            $table->json('payload');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['template_id', 'category', 'key']);
        });

        Schema::create('tenants', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('company_name');
            $table->string('legal_name')->nullable();
            $table->string('owner_name');
            $table->string('owner_email');
            $table->string('owner_phone')->nullable();
            $table->string('country', 2)->nullable();
            $table->text('address')->nullable();
            $table->string('timezone')->default('UTC');
            $table->string('currency', 3)->default('USD');
            $table->string('status')->default('pending')->index();
            $table->text('status_reason')->nullable();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('default_template_id')->nullable()->constrained('default_data_templates')->nullOnDelete();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->string('database_name')->nullable()->unique();
            $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->json('data')->nullable();
        });

        Schema::create('domains', function (Blueprint $table): void {
            $table->id();
            $table->string('domain')->unique();
            $table->string('tenant_id');
            $table->string('type')->default('subdomain');
            $table->string('status')->default('pending');
            $table->boolean('is_primary')->default(false);
            $table->string('verification_token', 64)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->string('ssl_status')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnUpdate()->cascadeOnDelete();
            $table->index(['tenant_id', 'is_primary']);
        });

        Schema::create('subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('plan_id')->constrained();
            $table->string('status')->default('trialing')->index();
            $table->string('billing_cycle')->default('monthly');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_starts_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('gateway')->nullable();
            $table->string('gateway_customer_id')->nullable();
            $table->string('gateway_subscription_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('tenant_invoices', function (Blueprint $table): void {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->string('tenant_id');
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            foreach (['subtotal', 'discount', 'tax', 'total'] as $money) {
                $table->decimal($money, 14, 2)->default(0);
            }
            $table->string('currency', 3);
            $table->string('status')->default('draft')->index();
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('gateway')->nullable();
            $table->string('gateway_invoice_id')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('payment_gateways', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('mode')->default('sandbox');
            $table->boolean('is_active')->default(false);
            $table->text('public_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->json('supported_currencies')->nullable();
            $table->json('config')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('invoice_id')->nullable()->constrained('tenant_invoices')->nullOnDelete();
            $table->string('gateway');
            $table->string('gateway_transaction_id')->nullable()->index();
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3);
            $table->string('status')->default('pending')->index();
            $table->string('payment_method')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('failed_reason')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('tenant_payment_webhook_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('gateway');
            $table->string('event_type');
            $table->string('event_id')->nullable()->unique();
            $table->json('payload');
            $table->string('status')->default('pending');
            $table->timestamp('processed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::create('website_pages', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('page_type')->default('custom');
            $table->json('content')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->text('meta_keywords')->nullable();
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->string('og_image')->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('status')->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('website_sections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('page_id')->constrained('website_pages')->cascadeOnDelete();
            $table->string('section_key');
            $table->string('section_type');
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->longText('content')->nullable();
            $table->string('image')->nullable();
            $table->string('button_text')->nullable();
            $table->string('button_url')->nullable();
            $table->json('settings')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('website_menus', function (Blueprint $table): void {
            $table->id();
            $table->string('label');
            $table->string('url')->nullable();
            $table->foreignId('page_id')->nullable()->constrained('website_pages')->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('website_menus')->cascadeOnDelete();
            $table->string('location')->default('header');
            $table->string('target')->default('same_tab');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('website_content_items', function (Blueprint $table): void {
            $table->id();
            $table->string('type')->index();
            $table->string('title')->nullable();
            $table->string('slug')->nullable();
            $table->longText('content')->nullable();
            $table->json('data')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['type', 'slug']);
        });

        Schema::create('platform_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('group')->index();
            $table->string('key')->unique();
            $table->longText('value')->nullable();
            $table->string('type')->default('string');
            $table->boolean('is_encrypted')->default(false);
            $table->boolean('is_public')->default(false);
            $table->timestamps();
        });

        Schema::create('tenant_provisioning_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id');
            $table->string('step');
            $table->string('status');
            $table->text('message')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('tenant_usage_metrics', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id');
            $table->date('period_start');
            $table->date('period_end');
            foreach (['users_count', 'branches_count', 'products_count', 'customers_count', 'invoices_count', 'storage_mb', 'ai_requests_count'] as $metric) {
                $table->unsignedBigInteger($metric)->default(0);
            }
            $table->json('data')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'period_start', 'period_end'], 'tenant_usage_period_unique');
        });

        Schema::create('central_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->string('action');
            $table->nullableMorphs('model');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['central_audit_logs', 'tenant_usage_metrics', 'tenant_provisioning_logs', 'platform_settings', 'website_content_items', 'website_menus', 'website_sections', 'website_pages', 'tenant_payment_webhook_logs', 'payment_transactions', 'payment_gateways', 'tenant_invoices', 'subscriptions', 'domains', 'tenants', 'default_template_items', 'default_data_templates', 'plan_features', 'plans', 'central_admin_users'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
