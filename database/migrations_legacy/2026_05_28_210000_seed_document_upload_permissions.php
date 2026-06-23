<?php

use App\Models\Permission;
use App\Models\Role;
use App\Services\Documents\DocumentPermissionService;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = DocumentPermissionService::ALL;

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Ensure the "Full Access Admin" role exists so it can be granted every permission.
        Role::firstOrCreate(['name' => 'Full Access Admin', 'guard_name' => 'web']);

        $adminRoleNames = [
            'Full Access Admin',
            'Full Access User',
            'Super Admin',
            'Admin',
            'Company Owner',
            'Company Admin',
            'System Manager',
            'super-admin',
            'admin',
        ];

        foreach ($adminRoleNames as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $role->givePermissionTo($permissions);
            }
        }

        $userBaseline = [
            'document_upload.view',
            'document_upload.create',
            'document_upload.scan_ai',
            'document_upload.extract.view',
            'document_upload.entity_match',
            'document_upload.proposal.create',
            'document_upload.proposal.update',
            'document_upload.convert',
        ];
        foreach (['User', 'Standard User', 'Branch User', 'Staff'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $role->givePermissionTo($userBaseline);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', DocumentPermissionService::ALL)
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
