<?php

namespace Tests\Feature\Ai;

use App\Models\Permission;
use App\Models\Role;
use Database\Seeders\AiPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiPermissionSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_debug_permission_is_created_assigned_and_preserved_on_repeat_runs(): void
    {
        $role = Role::query()->create([
            'name' => 'Admin',
            'guard_name' => 'web',
        ]);

        $this->seed(AiPermissionSeeder::class);
        $this->seed(AiPermissionSeeder::class);

        $this->assertDatabaseHas('permissions', [
            'name' => 'ai.debug.view',
            'guard_name' => 'web',
        ]);

        $permission = Permission::query()
            ->where('name', 'ai.debug.view')
            ->where('guard_name', 'web')
            ->firstOrFail();

        $this->assertTrue($role->fresh()->hasPermissionTo($permission));
    }
}
