<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AI\AiPermissionService;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class AiPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = AiPermissionService::ALL;

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Assistant permissions belong to the future add-on. Keep only generic
        // provider settings plus the core report-summary permission.
        Permission::query()
            ->where('guard_name', 'web')
            ->where('name', 'like', 'ai.%')
            ->whereNotIn('name', ['ai.settings.view', 'ai.settings.update'])
            ->delete();

        // Permission names are resolved through Spatie's cache when assigning
        // them to roles. Refresh it after creating and pruning permissions so
        // this seeder is safe on both fresh and already-installed databases.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Admin / Super Admin / Owner roles get every AI permission
        $adminRoleNames = [
            'Full Access User',
            'Full Access Admin',
            'Super Admin',
            'Admin',
            'Company Owner',
            'Company Admin',
            'System Manager',
            'super-admin',
            'admin',
        ];

        foreach ($adminRoleNames as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->givePermissionTo($permissions);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
