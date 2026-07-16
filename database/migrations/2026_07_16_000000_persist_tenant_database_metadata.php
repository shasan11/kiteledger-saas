<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            if (! Schema::hasColumn('tenants', 'database_provisioning_mode')) {
                $table->string('database_provisioning_mode')->nullable()->index();
            }
            if (! Schema::hasColumn('tenants', 'database_server')) {
                $table->string('database_server')->nullable();
            }
            if (! Schema::hasColumn('tenants', 'database_username')) {
                $table->text('database_username')->nullable();
            }
            if (! Schema::hasColumn('tenants', 'database_password')) {
                $table->text('database_password')->nullable();
            }
            if (! Schema::hasColumn('tenants', 'database_ownership_id')) {
                $table->uuid('database_ownership_id')->nullable();
            }
            if (! Schema::hasColumn('tenants', 'provisioned_at')) {
                $table->timestamp('provisioned_at')->nullable();
            }
        });

        Schema::table('tenant_database_pool', function (Blueprint $table): void {
            if (! Schema::hasColumn('tenant_database_pool', 'allocated_at')) {
                $table->timestamp('allocated_at')->nullable();
            }
            if (! Schema::hasColumn('tenant_database_pool', 'released_at')) {
                $table->timestamp('released_at')->nullable();
            }
            if (! Schema::hasColumn('tenant_database_pool', 'ownership_tenant_id')) {
                $table->string('ownership_tenant_id')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenant_database_pool', function (Blueprint $table): void {
            foreach (['allocated_at', 'released_at', 'ownership_tenant_id'] as $column) {
                if (Schema::hasColumn('tenant_database_pool', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('tenants', function (Blueprint $table): void {
            foreach (['database_provisioning_mode', 'database_server', 'database_username', 'database_password', 'database_ownership_id', 'provisioned_at'] as $column) {
                if (Schema::hasColumn('tenants', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
