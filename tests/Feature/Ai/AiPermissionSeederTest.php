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

    public function test_copilot_permissions_are_created_idempotently_and_assigned_to_admins(): void
    {
        $role = Role::query()->create([
            'name' => 'Admin',
            'guard_name' => 'web',
        ]);

        Permission::findOrCreate('ai.chat', 'web');

        $this->seed(AiPermissionSeeder::class);
        $this->seed(AiPermissionSeeder::class);

        $this->assertDatabaseHas('permissions', [
            'name' => 'reports.ai_summary',
            'guard_name' => 'web',
        ]);
        $this->assertDatabaseHas('permissions', [
            'name' => 'ai.chat',
            'guard_name' => 'web',
        ]);
        $this->assertDatabaseHas('permissions', [
            'name' => 'ai.actions.execute',
            'guard_name' => 'web',
        ]);

        $permission = Permission::query()
            ->where('name', 'reports.ai_summary')
            ->where('guard_name', 'web')
            ->firstOrFail();

        $this->assertTrue($role->fresh()->hasPermissionTo($permission));
        $this->assertTrue($role->fresh()->hasPermissionTo('ai.use'));
    }
}
