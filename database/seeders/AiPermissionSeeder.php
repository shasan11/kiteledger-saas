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

        // Prune obsolete legacy AI permissions if they exist.
        Permission::query()->where('guard_name', 'web')->whereIn('name', [
            'ai.settings.manage',
            'ai.logs.view',
            'ai.global_command.use',
            'ai.transaction_review.use',
            'ai.invoice_assistant.use',
            'ai.report_explainer.use',
            'ai.accounting_copilot.use',
            'ai.crm_assistant.use',
            'ai.payment_collection.use',
            'ai.inventory_insight.use',
        ])->delete();

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

        // Normal user roles get baseline AI use permissions
        $userBaseline = [
            'ai.view',
        ];
        foreach (['User', 'Standard User', 'Branch User', 'Staff'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->givePermissionTo($userBaseline);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
