<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class AdminAccessSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = Permission::query()->orderBy('name')->get();

        if ($permissions->isEmpty()) {
            return;
        }

        $adminRole = Role::query()->firstOrCreate(
            ['name' => 'Admin', 'guard_name' => 'web'],
            [
                'description' => 'System administrator',
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        Role::query()
            ->whereIn('name', ['Super Admin', 'Admin', 'super-admin', 'admin'])
            ->get()
            ->each(function (Role $role) use ($permissions): void {
                $role->update(['guard_name' => $role->guard_name ?: 'web']);
                $role->syncPermissions($permissions);
            });

        $mainUser = User::query()
            ->where('email', env('SEED_MAIN_USER_EMAIL', 'shasandhakal1105@gmail.com'))
            ->first();

        if (!$mainUser) {
            return;
        }

        $mainUser->syncRoles([$adminRole]);
        $mainUser->syncPermissions($permissions);

        if ($mainUser->role_id !== $adminRole->id) {
            $mainUser->forceFill(['role_id' => $adminRole->id])->save();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
