<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

class FullPermissionUserSeeder extends Seeder
{
    public function run(): void
    {
        if (class_exists(PermissionRegistrar::class)) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }

        $this->call(RolesAndPermissionsSeeder::class);

        $permissionQuery = Permission::query();

        if (Schema::hasColumn('permissions', 'guard_name')) {
            $permissionQuery->where(function ($query) {
                $query->where('guard_name', 'web')->orWhereNull('guard_name');
            });
        }

        $permissions = $permissionQuery->orderBy('name')->get();

        if ($permissions->isEmpty()) {
            return;
        }

        $role = Role::query()->firstOrCreate(
            ['name' => env('SEED_FULL_ACCESS_ROLE', 'Full Access User')],
            [
                'guard_name' => 'web',
                'description' => 'User role with every system permission.',
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $role->forceFill([
            'guard_name' => 'web',
            'active' => true,
            'is_system_generated' => true,
        ])->save();

        $role->syncPermissions($permissions);

        $email = env('SEED_FULL_ACCESS_USER_EMAIL', 'admin@kiteledger.test');
        $password = env('SEED_FULL_ACCESS_USER_PASSWORD', 'Password123!');
        $branchId = env('SEED_FULL_ACCESS_BRANCH_ID') ?: Branch::query()->value('id');

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('SEED_FULL_ACCESS_USER_NAME', 'Full Access Admin'),
                'first_name' => env('SEED_FULL_ACCESS_FIRST_NAME', 'Full Access'),
                'last_name' => env('SEED_FULL_ACCESS_LAST_NAME', 'Admin'),
                'username' => env('SEED_FULL_ACCESS_USERNAME', 'fulladmin'),
                'branch_id' => $branchId,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'active' => true,
                'is_system_generated' => true,
                'role_id' => $role->id,
            ]
        );

        $user->syncRoles([$role]);
        $user->syncPermissions($permissions);

        if (class_exists(PermissionRegistrar::class)) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }
}
