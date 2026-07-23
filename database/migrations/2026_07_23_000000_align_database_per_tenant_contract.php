<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            if (! Schema::hasColumn('tenants', 'slug')) $table->string('slug')->nullable()->unique();
            if (! Schema::hasColumn('tenants', 'provisioning_step')) $table->string('provisioning_step')->nullable()->index();
            if (! Schema::hasColumn('tenants', 'last_provisioning_error')) $table->text('last_provisioning_error')->nullable();
            if (! Schema::hasColumn('tenants', 'suspended_at')) $table->timestamp('suspended_at')->nullable();
            if (! Schema::hasColumn('tenants', 'tenancy_db_connection')) $table->string('tenancy_db_connection')->nullable();
            if (! Schema::hasColumn('tenants', 'tenancy_db_name')) $table->string('tenancy_db_name')->nullable()->index();
            if (! Schema::hasColumn('tenants', 'tenancy_db_host')) $table->string('tenancy_db_host')->nullable();
            if (! Schema::hasColumn('tenants', 'tenancy_db_port')) $table->unsignedInteger('tenancy_db_port')->nullable();
            if (! Schema::hasColumn('tenants', 'tenancy_db_username')) $table->string('tenancy_db_username')->nullable();
            if (! Schema::hasColumn('tenants', 'tenancy_db_password')) $table->text('tenancy_db_password')->nullable();
            if (! Schema::hasColumn('tenants', 'database_created_by_app')) $table->boolean('database_created_by_app')->default(false);
        });

        Schema::table('domains', function (Blueprint $table): void {
            if (! Schema::hasColumn('domains', 'verification_status')) $table->string('verification_status')->default('pending')->index();
            if (! Schema::hasColumn('domains', 'last_verification_error')) $table->text('last_verification_error')->nullable();
        });

        Schema::create('features', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type')->default('boolean');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('plan_feature', function (Blueprint $table): void {
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('feature_id')->constrained()->cascadeOnDelete();
            $table->boolean('enabled')->default(true);
            $table->unsignedBigInteger('limit_value')->nullable();
            $table->timestamps();
            $table->primary(['plan_id', 'feature_id']);
        });

        Schema::create('tenant_feature_overrides', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('feature_id')->constrained()->cascadeOnDelete();
            $table->boolean('enabled')->nullable();
            $table->unsignedBigInteger('limit_value')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'feature_id']);
        });

        Schema::create('installation_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->boolean('is_encrypted')->default(false);
            $table->timestamps();
        });

        Schema::create('platform_operation_jobs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->nullable()->index();
            $table->string('operation')->index();
            $table->string('status')->default('queued')->index();
            $table->string('current_step')->nullable();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->text('safe_error')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->timestamp('finished_at')->nullable();
        });

        Schema::create('central_password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        foreach (['central_password_reset_tokens', 'platform_operation_jobs', 'installation_settings', 'tenant_feature_overrides', 'plan_feature', 'features'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
