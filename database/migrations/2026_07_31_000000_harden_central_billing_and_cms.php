<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_pages', function (Blueprint $table): void {
            $table->json('draft_payload')->nullable();
            $table->timestamp('draft_updated_at')->nullable();
            $table->foreignId('draft_updated_by')->nullable()->constrained('central_admin_users')->nullOnDelete();
        });

        Schema::create('website_redirects', function (Blueprint $table): void {
            $table->id();
            $table->string('source_path')->unique();
            $table->string('destination_path');
            $table->unsignedSmallInteger('status_code')->default(301);
            $table->unsignedBigInteger('hits')->default(0);
            $table->timestamp('last_hit_at')->nullable();
            $table->timestamps();
        });

        Schema::table('central_admin_users', function (Blueprint $table): void {
            $table->text('mfa_secret')->nullable();
            $table->text('mfa_recovery_codes')->nullable();
            $table->timestamp('mfa_confirmed_at')->nullable();
        });

        if (Schema::hasTable('tenant_deletion_requests') && Schema::hasColumn('tenant_deletion_requests', 'backup_manifest_id')) {
            Schema::table('tenant_deletion_requests', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('backup_manifest_id');
                $table->dropColumn('backup_waived');
            });
        }
        Schema::dropIfExists('backup_manifests');
        if (Schema::hasTable('platform_settings')) {
            DB::table('platform_settings')->where('group', 'backups')->delete();
            DB::table('platform_settings')->where('key', 'like', 'notifications.%backup%')->delete();
        }
        if (Schema::hasTable('notification_templates')) {
            DB::table('notification_templates')->where('key', 'backup_failed')->delete();
        }
        if (Schema::hasTable('central_permissions')) {
            $backupPermissionIds = DB::table('central_permissions')->where('name', 'tenant.backup')->pluck('id');
            if (Schema::hasTable('central_permission_role')) {
                DB::table('central_permission_role')->whereIn('permission_id', $backupPermissionIds)->delete();
            }
            DB::table('central_permissions')->whereIn('id', $backupPermissionIds)->delete();
        }
    }

    public function down(): void
    {
        Schema::table('central_admin_users', fn (Blueprint $table) => $table->dropColumn(['mfa_secret', 'mfa_recovery_codes', 'mfa_confirmed_at']));
        Schema::dropIfExists('website_redirects');
        Schema::table('website_pages', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('draft_updated_by');
            $table->dropColumn(['draft_payload', 'draft_updated_at']);
        });
    }
};
