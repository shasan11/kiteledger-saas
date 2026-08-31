<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('central_admin_users', function (Blueprint $table): void {
            $table->string('avatar_path')->nullable();
            $table->string('locale', 12)->default('en');
            $table->string('timezone')->default('UTC');
        });

        Schema::create('website_features', function (Blueprint $table): void {
            $table->id(); $table->string('title'); $table->string('slug')->unique(); $table->text('excerpt')->nullable(); $table->longText('body')->nullable();
            $table->foreignId('featured_media_id')->nullable()->constrained('central_media')->nullOnDelete(); $table->string('status')->default('draft')->index(); $table->unsignedInteger('sort_order')->default(0);
            $table->string('seo_title')->nullable(); $table->text('meta_description')->nullable(); $table->string('canonical_url')->nullable(); $table->string('og_title')->nullable(); $table->text('og_description')->nullable(); $table->string('og_image')->nullable();
            $table->timestamp('published_at')->nullable()->index(); $table->timestamps(); $table->softDeletes();
        });
        Schema::create('resource_categories', function (Blueprint $table): void {
            $table->id(); $table->string('name'); $table->string('slug')->unique(); $table->text('description')->nullable(); $table->string('status')->default('active')->index(); $table->unsignedInteger('sort_order')->default(0); $table->timestamps(); $table->softDeletes();
        });
        Schema::create('resource_articles', function (Blueprint $table): void {
            $table->id(); $table->foreignId('category_id')->nullable()->constrained('resource_categories')->nullOnDelete(); $table->string('title'); $table->string('slug')->unique(); $table->text('excerpt')->nullable(); $table->longText('body');
            $table->foreignId('featured_media_id')->nullable()->constrained('central_media')->nullOnDelete(); $table->json('gallery_media_ids')->nullable(); $table->string('status')->default('draft')->index(); $table->unsignedInteger('sort_order')->default(0);
            $table->string('seo_title')->nullable(); $table->text('meta_description')->nullable(); $table->string('canonical_url')->nullable(); $table->string('og_title')->nullable(); $table->text('og_description')->nullable(); $table->string('og_image')->nullable();
            $table->timestamp('published_at')->nullable()->index(); $table->timestamps(); $table->softDeletes();
        });
        Schema::create('contact_locations', function (Blueprint $table): void {
            $table->id(); $table->string('name'); $table->text('address'); $table->string('email')->nullable(); $table->string('phone')->nullable(); $table->text('business_hours')->nullable(); $table->text('map_embed_url')->nullable(); $table->boolean('is_active')->default(true)->index(); $table->unsignedInteger('sort_order')->default(0); $table->timestamps();
        });
        Schema::create('website_social_links', function (Blueprint $table): void {
            $table->id(); $table->string('platform'); $table->string('url'); $table->string('icon')->nullable(); $table->boolean('is_active')->default(true)->index(); $table->unsignedInteger('sort_order')->default(0); $table->timestamps();
        });
        Schema::create('website_popups', function (Blueprint $table): void {
            $table->id(); $table->string('title'); $table->text('content'); $table->foreignId('media_id')->nullable()->constrained('central_media')->nullOnDelete(); $table->string('cta_label')->nullable(); $table->string('cta_url')->nullable(); $table->string('target')->default('same_tab'); $table->string('frequency')->default('once'); $table->boolean('is_dismissible')->default(true); $table->boolean('is_active')->default(false)->index(); $table->timestamp('starts_at')->nullable(); $table->timestamp('ends_at')->nullable(); $table->timestamps();
        });
        Schema::create('navbar_notifications', function (Blueprint $table): void {
            $table->id(); $table->text('content'); $table->string('link_label')->nullable(); $table->string('link_url')->nullable(); $table->string('target')->default('same_tab'); $table->boolean('is_dismissible')->default(true); $table->boolean('is_active')->default(false)->index(); $table->unsignedInteger('sort_order')->default(0); $table->timestamp('starts_at')->nullable(); $table->timestamp('ends_at')->nullable(); $table->timestamps();
        });

        Schema::create('communication_campaigns', function (Blueprint $table): void {
            $table->id(); $table->string('name'); $table->string('channel'); $table->string('subject')->nullable(); $table->longText('content'); $table->string('status')->default('draft')->index(); $table->timestamp('scheduled_at')->nullable()->index(); $table->timestamp('started_at')->nullable(); $table->timestamp('completed_at')->nullable(); $table->foreignId('created_by')->nullable()->constrained('central_admin_users')->nullOnDelete(); $table->json('metadata')->nullable(); $table->timestamps(); $table->softDeletes();
        });
        Schema::create('communication_recipients', function (Blueprint $table): void {
            $table->id(); $table->foreignId('campaign_id')->constrained('communication_campaigns')->cascadeOnDelete(); $table->string('tenant_id')->nullable(); $table->string('name')->nullable(); $table->string('email')->nullable(); $table->string('phone')->nullable(); $table->string('consent_source'); $table->timestamp('consented_at'); $table->string('status')->default('pending')->index(); $table->string('unsubscribe_token', 64)->unique(); $table->timestamps(); $table->unique(['campaign_id', 'email', 'phone'], 'communication_recipient_unique');
        });
        Schema::create('communication_deliveries', function (Blueprint $table): void {
            $table->id(); $table->foreignId('campaign_id')->constrained('communication_campaigns')->cascadeOnDelete(); $table->foreignId('recipient_id')->constrained('communication_recipients')->cascadeOnDelete(); $table->string('status')->default('queued')->index(); $table->unsignedInteger('attempts')->default(0); $table->string('provider_reference')->nullable(); $table->text('error_message')->nullable(); $table->timestamp('sent_at')->nullable(); $table->timestamps(); $table->unique(['campaign_id', 'recipient_id']);
        });
        Schema::create('communication_suppressions', function (Blueprint $table): void {
            $table->id(); $table->string('channel'); $table->string('destination'); $table->string('reason')->nullable(); $table->timestamp('suppressed_at')->useCurrent(); $table->timestamps(); $table->unique(['channel', 'destination']);
        });

        DB::table('platform_settings')->whereIn('key', [
            'security.require_mfa_for_superadmins', 'security.require_mfa_for_all_admins', 'security.require_mfa_for_impersonation', 'security.require_mfa_for_refunds', 'security.require_mfa_for_tenant_deletion',
        ])->delete();
        foreach (['mfa_secret', 'mfa_recovery_codes', 'mfa_confirmed_at'] as $column) {
            if (Schema::hasColumn('central_admin_users', $column)) {
                Schema::table('central_admin_users', fn (Blueprint $table) => $table->dropColumn($column));
            }
        }
    }

    public function down(): void
    {
        foreach (['communication_suppressions', 'communication_deliveries', 'communication_recipients', 'communication_campaigns', 'navbar_notifications', 'website_popups', 'website_social_links', 'contact_locations', 'resource_articles', 'resource_categories', 'website_features'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('central_admin_users', function (Blueprint $table): void {
            $table->dropColumn(['avatar_path', 'locale', 'timezone']);
            $table->text('mfa_secret')->nullable(); $table->text('mfa_recovery_codes')->nullable(); $table->timestamp('mfa_confirmed_at')->nullable();
        });
    }
};
