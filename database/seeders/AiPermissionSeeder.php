<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class AiPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            // General AI access
            'ai.view',
            'ai.use',

            // Settings
            'ai.settings.view',
            'ai.settings.manage',

            // Logs
            'ai.logs.view',

            // Feature-level permissions
            'ai.global_command.use',
            'ai.transaction_review.use',
            'ai.invoice_assistant.use',
            'ai.report_explainer.use',
            'ai.accounting_copilot.use',
            'ai.crm_assistant.use',
            'ai.payment_collection.use',
            'ai.inventory_insight.use',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission, 'guard_name' => 'web']
            );
        }

        // Roles that should receive all AI permissions
        $adminRoleNames = [
            'Full Access User',  // primary full-access admin
            'Super Admin',
            'Admin',
            'Company Owner',
            'System Manager',
            'super-admin',
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
