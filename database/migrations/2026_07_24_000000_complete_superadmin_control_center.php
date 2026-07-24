<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table): void {
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->text('help_text')->nullable();
            $table->string('input_type')->default('text');
            $table->json('options')->nullable();
            $table->string('validation_rules')->nullable();
            $table->longText('default_value')->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_readonly')->default(false);
            $table->boolean('requires_restart')->default(false);
            $table->boolean('requires_confirmation')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('environment')->default('all');
            $table->timestamp('last_tested_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->index(['group', 'sort_order']);
        });

        Schema::table('payment_gateways', function (Blueprint $table): void {
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_test_status')->nullable();
            $table->text('last_test_message')->nullable();
        });

        Schema::create('platform_setting_revisions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('setting_id')->constrained('platform_settings')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->longText('old_value')->nullable();
            $table->longText('new_value')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['setting_id', 'created_at']);
        });

        Schema::table('website_pages', function (Blueprint $table): void {
            $table->text('excerpt')->nullable();
            $table->longText('body')->nullable();
            $table->foreignId('featured_media_id')->nullable();
            $table->string('layout')->default('default');
            $table->string('visibility')->default('public');
            $table->timestamp('scheduled_at')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('website_pages')->nullOnDelete();
            $table->string('focus_keyword')->nullable();
            $table->boolean('robots_index')->default(true);
            $table->boolean('robots_follow')->default(true);
            $table->string('twitter_title')->nullable();
            $table->text('twitter_description')->nullable();
            $table->string('twitter_image')->nullable();
            $table->json('schema_json')->nullable();
            $table->boolean('sitemap_include')->default(true);
            $table->decimal('sitemap_priority', 2, 1)->default(0.5);
            $table->string('sitemap_change_frequency')->default('monthly');
        });

        Schema::table('website_sections', function (Blueprint $table): void {
            $table->string('eyebrow')->nullable();
            $table->string('media_type')->nullable();
            $table->string('video_url')->nullable();
            $table->string('secondary_button_text')->nullable();
            $table->string('secondary_button_url')->nullable();
            $table->string('background_style')->nullable();
            $table->string('alignment')->default('left');
            $table->json('items')->nullable();
        });

        Schema::table('website_menus', function (Blueprint $table): void {
            $table->string('icon')->nullable();
        });

        Schema::create('central_media', function (Blueprint $table): void {
            $table->id();
            $table->string('disk')->default('public');
            $table->string('path')->unique();
            $table->string('original_filename');
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('title')->nullable();
            $table->string('alt_text')->nullable();
            $table->text('caption')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['mime_type', 'created_at']);
        });

        Schema::create('website_revisions', function (Blueprint $table): void {
            $table->id();
            $table->string('revisionable_type');
            $table->unsignedBigInteger('revisionable_id');
            $table->foreignId('admin_id')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->json('snapshot');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['revisionable_type', 'revisionable_id', 'created_at'], 'website_revision_lookup');
        });

        Schema::create('blog_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('blog_categories')->nullOnDelete();
            $table->foreignId('media_id')->nullable()->constrained('central_media')->nullOnDelete();
            $table->string('seo_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('status')->default('active')->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('blog_tags', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('blog_posts', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content')->nullable();
            $table->foreignId('featured_media_id')->nullable()->constrained('central_media')->nullOnDelete();
            $table->string('featured_image_alt')->nullable();
            $table->foreignId('author_id')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->string('status')->default('draft')->index();
            $table->string('visibility')->default('public');
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('reading_time')->default(1);
            $table->string('seo_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('focus_keyword')->nullable();
            $table->string('canonical_url')->nullable();
            $table->boolean('robots_index')->default(true);
            $table->boolean('robots_follow')->default(true);
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->string('og_image')->nullable();
            $table->string('twitter_title')->nullable();
            $table->text('twitter_description')->nullable();
            $table->string('twitter_image')->nullable();
            $table->json('article_schema')->nullable();
            $table->boolean('sitemap_include')->default(true);
            $table->decimal('sitemap_priority', 2, 1)->default(0.6);
            $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('blog_post_category', function (Blueprint $table): void {
            $table->foreignId('blog_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blog_category_id')->constrained()->cascadeOnDelete();
            $table->primary(['blog_post_id', 'blog_category_id']);
        });

        Schema::create('blog_post_tag', function (Blueprint $table): void {
            $table->foreignId('blog_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blog_tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['blog_post_id', 'blog_tag_id']);
        });

        Schema::table('features', function (Blueprint $table): void {
            $table->string('category')->default('general')->index();
            $table->longText('default_value')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->boolean('is_billable')->default(false);
            $table->string('unit_label')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
        });

        Schema::table('plan_feature', function (Blueprint $table): void {
            $table->longText('value')->nullable();
            $table->boolean('inherit_default')->default(true);
            $table->boolean('display_on_pricing')->default(true);
            $table->string('pricing_label')->nullable();
        });

        Schema::table('tenant_feature_overrides', function (Blueprint $table): void {
            $table->string('mode')->default('inherit');
            $table->longText('value')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->index(['expires_at', 'mode']);
        });

        Schema::table('tenant_invoices', function (Blueprint $table): void {
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('balance', 14, 2)->default(0);
            $table->json('seller_snapshot')->nullable();
            $table->json('buyer_snapshot')->nullable();
            $table->json('tax_snapshot')->nullable();
            $table->json('customization_snapshot')->nullable();
            $table->json('line_items_snapshot')->nullable();
        });

        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->string('reference')->nullable();
            $table->string('bank_reference')->nullable();
            $table->text('notes')->nullable();
            $table->string('proof_disk')->nullable();
            $table->string('proof_path')->nullable();
            $table->foreignId('added_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->boolean('receipt_sent')->default(false);
            $table->index(['reference', 'gateway']);
        });

        Schema::create('central_notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('admin_id')->nullable()->constrained('central_admin_users')->cascadeOnDelete();
            $table->string('type');
            $table->string('category')->index();
            $table->string('severity')->default('info')->index();
            $table->string('title');
            $table->text('message');
            $table->string('action_url')->nullable();
            $table->string('action_label')->nullable();
            $table->nullableMorphs('related');
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['admin_id', 'created_at']);
        });

        Schema::create('notification_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('subject');
            $table->longText('body');
            $table->json('channels')->nullable();
            $table->json('variables')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('support_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('default_priority')->default('normal');
            $table->foreignId('default_assignee_id')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('support_saved_replies', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->longText('body');
            $table->foreignId('category_id')->nullable()->constrained('support_categories')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('central_support_tickets', function (Blueprint $table): void {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('tenant_id')->index();
            $table->unsignedBigInteger('requester_user_id')->nullable();
            $table->string('requester_name');
            $table->string('requester_email');
            $table->string('subject');
            $table->longText('description');
            $table->foreignId('category_id')->nullable()->constrained('support_categories')->nullOnDelete();
            $table->string('priority')->default('normal')->index();
            $table->string('status')->default('open')->index();
            $table->string('source')->default('tenant_portal');
            $table->foreignId('assigned_admin_id')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamp('first_response_due_at')->nullable();
            $table->timestamp('resolution_due_at')->nullable();
            $table->timestamp('sla_breached_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['assigned_admin_id', 'status']);
            $table->index(['tenant_id', 'updated_at']);
        });

        Schema::create('central_support_ticket_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ticket_id')->constrained('central_support_tickets')->cascadeOnDelete();
            $table->string('sender_type');
            $table->unsignedBigInteger('sender_id')->nullable();
            $table->string('sender_name');
            $table->string('sender_email')->nullable();
            $table->longText('plain_body');
            $table->longText('html_body')->nullable();
            $table->boolean('is_internal_note')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            $table->index(['ticket_id', 'created_at']);
        });

        Schema::create('central_support_ticket_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ticket_id')->constrained('central_support_tickets')->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained('central_support_ticket_messages')->cascadeOnDelete();
            $table->string('disk')->default('local');
            $table->string('path')->unique();
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->string('uploader_type');
            $table->unsignedBigInteger('uploader_id')->nullable();
            $table->timestamps();
        });

        Schema::create('central_support_ticket_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ticket_id')->constrained('central_support_tickets')->cascadeOnDelete();
            $table->string('actor_type');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('event');
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['central_support_ticket_events', 'central_support_ticket_attachments', 'central_support_ticket_messages', 'central_support_tickets', 'support_saved_replies', 'support_categories', 'notification_templates', 'central_notifications', 'blog_post_tag', 'blog_post_category', 'blog_posts', 'blog_tags', 'blog_categories', 'website_revisions', 'central_media', 'platform_setting_revisions'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->dropIndex(['reference', 'gateway']);
            $table->dropConstrainedForeignId('added_by');
            $table->dropColumn(['reference', 'bank_reference', 'notes', 'proof_disk', 'proof_path', 'receipt_sent']);
        });
        Schema::table('tenant_invoices', fn (Blueprint $table) => $table->dropColumn(['paid_amount', 'balance', 'seller_snapshot', 'buyer_snapshot', 'tax_snapshot', 'customization_snapshot', 'line_items_snapshot']));
        Schema::table('tenant_feature_overrides', function (Blueprint $table): void {
            $table->dropIndex(['expires_at', 'mode']);
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('updated_by');
            $table->dropColumn(['mode', 'value', 'starts_at']);
        });
        Schema::table('plan_feature', fn (Blueprint $table) => $table->dropColumn(['value', 'inherit_default', 'display_on_pricing', 'pricing_label']));
        Schema::table('features', function (Blueprint $table): void {
            $table->dropIndex(['category']);
            $table->dropColumn(['category', 'default_value', 'is_visible', 'is_billable', 'unit_label', 'sort_order']);
        });
        Schema::table('website_menus', fn (Blueprint $table) => $table->dropColumn('icon'));
        Schema::table('website_sections', fn (Blueprint $table) => $table->dropColumn(['eyebrow', 'media_type', 'video_url', 'secondary_button_text', 'secondary_button_url', 'background_style', 'alignment', 'items']));
        Schema::table('website_pages', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn(['excerpt', 'body', 'featured_media_id', 'layout', 'visibility', 'scheduled_at', 'focus_keyword', 'robots_index', 'robots_follow', 'twitter_title', 'twitter_description', 'twitter_image', 'schema_json', 'sitemap_include', 'sitemap_priority', 'sitemap_change_frequency']);
        });
        Schema::table('payment_gateways', fn (Blueprint $table) => $table->dropColumn(['last_tested_at', 'last_test_status', 'last_test_message']));
        Schema::table('platform_settings', function (Blueprint $table): void {
            $table->dropIndex(['group', 'sort_order']);
            $table->dropConstrainedForeignId('updated_by');
            $table->dropColumn(['label', 'description', 'help_text', 'input_type', 'options', 'validation_rules', 'default_value', 'is_required', 'is_readonly', 'requires_restart', 'requires_confirmation', 'sort_order', 'environment', 'last_tested_at']);
        });
    }
};
