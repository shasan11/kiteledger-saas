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

        // Permission names are resolved through Spatie's cache when assigning
        // them to roles. Refresh it after creating permissions so this seeder
        // is safe on both fresh and already-installed databases.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Admin / Super Admin / Owner roles get every AI permission.
        //
        // This list must cover every role RolesAndPermissionsSeeder defines as
        // `allow => ['*']`, because that wildcard is expanded when *that*
        // seeder runs — it cannot grant permissions this seeder creates later.
        // Main Branch Admin and Branch Admin were missing here, which left the
        // tenant's own administrators with ai.settings.* but without ai.use,
        // so the Copilot was hidden from the sidebar and /api/ai/health
        // answered 403 for them.
        $adminRoleNames = [
            'Full Access User',
            'Full Access Admin',
            'Super Admin',
            'Admin',
            'Company Owner',
            'Company Admin',
            'Main Branch Admin',
            'Branch Admin',
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
