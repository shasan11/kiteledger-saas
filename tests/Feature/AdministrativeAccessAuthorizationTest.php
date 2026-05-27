<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\Invoice;
use App\Models\Role;
use App\Models\User;
use App\Services\AppContextService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
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

    public function test_full_access_roles_bypass_branch_scope(): void
    {
        $this->assertContains('Full Access User', BranchScopeService::ABOVE_BRANCH_ROLES);
        $this->assertContains('Full Access Admin', BranchScopeService::ABOVE_BRANCH_ROLES);
    }

    public function test_full_access_role_relation_can_override_fiscal_year_lock(): void
    {
        $role = new Role(['name' => 'Full Access Admin']);

        $user = new User(['email' => 'admin@example.test']);
        $user->setRelation('role', $role);

        $this->assertTrue(app(AppContextService::class)->canOverrideFiscalYearLock($user));
    }

    public function test_full_access_all_branch_create_gets_real_branch_id(): void
    {
        if (!Schema::hasTable('branches') || !Schema::hasTable('invoices')) {
            $this->markTestSkipped('Branch-scoped transaction tables are not migrated in this test connection.');
        }

        $branchId = (string) Str::uuid();

        DB::table('branches')->insert([
            'id' => $branchId,
            'code' => 'TEST-HO-' . Str::random(8),
            'name' => 'Test Head Office',
            'active' => true,
            'is_head_office' => true,
            'is_transaction_enabled' => true,
            'is_pos_enabled' => true,
            'is_warehouse_enabled' => true,
            'is_ai_enabled' => true,
            'is_billing_location_enabled' => true,
            'abbreviated_tax_enabled' => false,
            'track_location' => false,
            'is_system_generated' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $role = new Role(['name' => 'Full Access Admin']);

        $user = new User(['email' => 'admin@example.test']);
        $user->setRelation('role', $role);

        $request = Request::create('/api/invoices', 'POST');
        $request->headers->set('X-Branch-ID', 'all');
        $request->setUserResolver(fn () => $user);

        $controller = new class extends BaseCrudApiController {
            protected string $modelClass = Invoice::class;
            protected bool $branchScoped = true;
            protected bool $autoFillBranchOnCreate = true;

            public function fillBranch(array $data, Request $request): array
            {
                return $this->applyBranchToCreatePayload($data, $request);
            }
        };

        $payload = $controller->fillBranch(['branch_id' => 'all'], $request);

        $this->assertSame($branchId, $payload['branch_id'] ?? null);
    }
}
