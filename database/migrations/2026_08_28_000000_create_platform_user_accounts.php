<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Platform (customer) accounts live in the CENTRAL database so one person can
 * hold a single KiteLedger identity across many tenants. Tenant-local users
 * (App\Models\User) and central operators (CentralAdmin) are untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_users', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('phone')->nullable();
            $table->string('password')->nullable();
            $table->string('avatar')->nullable();
            $table->string('locale', 10)->nullable();
            $table->string('timezone')->default('UTC');
            $table->string('country', 2)->nullable();
            $table->string('status')->default('active')->index();
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('force_password_reset')->default(false);
            $table->timestamp('password_changed_at')->nullable();
            $table->timestamp('sessions_invalidated_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('central_user_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('central_user_id')->unique()->constrained('central_users')->cascadeOnDelete();
            $table->string('job_title')->nullable();
            $table->string('company')->nullable();
            $table->string('phone_secondary')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('address_line_1')->nullable();
            $table->string('address_line_2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('postal_code', 32)->nullable();
            $table->string('country', 2)->nullable();
            $table->string('preferred_currency', 3)->nullable();
            $table->string('preferred_language', 10)->nullable();
            $table->string('timezone')->nullable();
            $table->string('avatar')->nullable();
            $table->text('bio')->nullable();
            $table->json('notification_preferences')->nullable();
            $table->timestamps();
        });

        // Explicit index/constraint names: the generated ones would breach the
        // 64 character MySQL identifier limit for this table name.
        Schema::create('central_user_tenant_memberships', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('central_user_id')->constrained('central_users')->cascadeOnDelete();
            $table->string('tenant_id');
            $table->string('role')->default('member');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_primary')->default(false);
            foreach (['can_access_tenant', 'can_manage_users', 'can_manage_billing', 'can_manage_plan', 'can_view_invoices', 'can_make_payments', 'can_manage_company', 'can_manage_integrations'] as $permission) {
                $table->boolean($permission)->default(false);
            }
            // Informational only. Never a cross-database foreign key.
            $table->unsignedBigInteger('tenant_user_id')->nullable();
            $table->string('invited_by_type')->nullable();
            $table->string('invited_by_id')->nullable();
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id', 'cutm_tenant_id_foreign')->references('id')->on('tenants')->cascadeOnUpdate()->cascadeOnDelete();
            $table->unique(['central_user_id', 'tenant_id'], 'cutm_user_tenant_unique');
            $table->index('tenant_id', 'cutm_tenant_index');
            $table->index('is_active', 'cutm_active_index');
            $table->index('role', 'cutm_role_index');
        });

        Schema::create('central_user_invitations', function (Blueprint $table): void {
            $table->id();
            $table->string('email')->index();
            $table->string('tenant_id');
            $table->string('role')->default('member');
            $table->json('permissions')->nullable();
            $table->string('token_hash', 64)->unique();
            $table->string('invited_by_type')->nullable();
            $table->string('invited_by_id')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id', 'cui_tenant_id_foreign')->references('id')->on('tenants')->cascadeOnUpdate()->cascadeOnDelete();
        });

        Schema::create('platform_password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::table('central_audit_logs', function (Blueprint $table): void {
            $table->foreignId('platform_user_id')->nullable()->after('admin_id')->constrained('central_users')->nullOnDelete();
            $table->string('tenant_id')->nullable()->after('platform_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('central_audit_logs', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('platform_user_id');
            $table->dropColumn('tenant_id');
        });
        foreach (['platform_password_reset_tokens', 'central_user_invitations', 'central_user_tenant_memberships', 'central_user_profiles', 'central_users'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
