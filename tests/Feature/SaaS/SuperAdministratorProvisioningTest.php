<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\CentralAdmin;
use App\Support\Central\SuperAdministratorProvisioner;
use Database\Seeders\CentralAdminSeeder;
use Database\Seeders\CentralRolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Env;
use Tests\TestCase;

class SuperAdministratorProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_provisioner_creates_super_administrator_with_every_permission(): void
    {
        $admin = SuperAdministratorProvisioner::ensure('owner@example.test', 'Owner', 'secret-password-12');

        $this->assertNotNull($admin);
        $this->assertSame('super_admin', $admin->role);
        $this->assertTrue($admin->is_active);

        $granted = $admin->roles()->with('permissions')->get()->flatMap->permissions->pluck('name')->all();

        $this->assertSame(
            [],
            array_diff(CentralRolesAndPermissionsSeeder::PERMISSIONS, $granted),
            'Super administrator is missing central permissions.'
        );

        foreach (CentralRolesAndPermissionsSeeder::PERMISSIONS as $permission) {
            $this->assertTrue($admin->can($permission), "Cannot {$permission}");
        }
    }

    public function test_env_driven_seeder_attaches_the_super_administrator_role(): void
    {
        $repository = Env::getRepository();
        $repository->set('CENTRAL_ADMIN_EMAIL', 'seeded@example.test');
        $repository->set('CENTRAL_ADMIN_PASSWORD', 'secret-password-12');

        $this->seed(CentralAdminSeeder::class);

        $admin = CentralAdmin::where('email', 'seeded@example.test')->firstOrFail();

        $this->assertTrue($admin->roles()->where('name', 'super_administrator')->exists());

        $repository->clear('CENTRAL_ADMIN_EMAIL');
        $repository->clear('CENTRAL_ADMIN_PASSWORD');
    }

    public function test_roles_seeder_backfills_role_less_super_administrators(): void
    {
        $admin = CentralAdmin::create([
            'name' => 'Legacy', 'email' => 'legacy@example.test',
            'password' => bcrypt('secret-password-12'), 'role' => 'super_admin', 'is_active' => true,
        ]);

        $this->assertFalse($admin->roles()->exists());

        $this->seed(CentralRolesAndPermissionsSeeder::class);

        $this->assertTrue($admin->roles()->where('name', 'super_administrator')->exists());
    }
}
