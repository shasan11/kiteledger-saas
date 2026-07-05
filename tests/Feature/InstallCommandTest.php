<?php

namespace Tests\Feature;

use App\Console\Commands\InstallCommand;
use App\Models\Central\CentralAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use ReflectionMethod;
use Tests\TestCase;

class InstallCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_installer_updates_the_central_administrator_without_tenant_context(): void
    {
        $admin = CentralAdmin::create([
            'name' => 'Seed Administrator',
            'email' => 'admin@kiteledger.test',
            'password' => Hash::make('temporary-password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        (new ReflectionMethod(InstallCommand::class, 'updateAdministrator'))->invoke(
            new InstallCommand,
            [
                'admin_name' => 'KiteLedger Admin',
                'admin_email' => 'admin@vedanica.com',
                'admin_password' => 'SecurePassword!123',
            ],
        );

        $admin->refresh();

        $this->assertSame('KiteLedger Admin', $admin->name);
        $this->assertSame('admin@vedanica.com', $admin->email);
        $this->assertTrue(Hash::check('SecurePassword!123', $admin->password));
        $this->assertTrue($admin->is_active);
    }
}
