<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Services\Documents\DocumentPermissionService;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class DocumentUploadPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = DocumentPermissionService::ALL;
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $adminRoleNames = [
            'Full Access User', 'Full Access Admin', 'Super Admin', 'Admin',
            'Company Owner', 'Company Admin', 'System Manager',
            'super-admin', 'admin',
        ];
        foreach ($adminRoleNames as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) $role->givePermissionTo($permissions);
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
            $role = Role::where('name', $roleName)->first();
            if ($role) $role->givePermissionTo($userBaseline);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
