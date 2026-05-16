<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\TestCase;

class AdministrativeAccessAuthorizationTest extends TestCase
{
    public function test_full_access_role_relation_bypasses_crud_permission_prefix_checks(): void
    {
        $role = new Role(['name' => 'Full Access User']);

        $user = new User(['email' => 'admin@example.test']);
        $user->setRelation('role', $role);

        $request = Request::create('/api/hrm/projects', 'POST');
        $request->setUserResolver(fn () => $user);

        $controller = new class extends BaseCrudApiController {
            protected string $modelClass = User::class;
            protected ?string $permissionPrefix = 'project.project';

            public function assertStoreAccess(Request $request): void
            {
                $this->checkAccess($request, 'store');
            }
        };

        $controller->assertStoreAccess($request);

        $this->assertTrue(true);
    }
}
