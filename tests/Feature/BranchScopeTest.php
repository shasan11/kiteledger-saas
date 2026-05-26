<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Invoice;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\BranchScopeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Phase 1 verification suite for the new BranchScopeService and the bulk-export
 * branch-leak fix in BaseCrudApiController.
 *
 * Each test sets up branches, a user, and (where needed) invoices, then drives
 * either the service directly or the HTTP layer. The goal is to lock down the
 * security rules called out in the implementation spec so they cannot silently
 * regress in later phases.
 */
class BranchScopeTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branchA;
    private Branch $branchB;

    protected function setUp(): void
    {
        parent::setUp();

        // Fresh permission cache per test — Spatie caches across tests by default.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // The roles that BranchScopeService treats as "above branch".
        foreach (['Super Admin', 'Company Owner', 'Main Branch Admin', 'Branch Admin', 'Full Access User', 'Full Access Admin'] as $name) {
            Role::findOrCreate($name, 'web');
        }

        // Canonical + legacy view-all permissions so we can exercise both code paths.
        Permission::findOrCreate(BranchScopeService::PERMISSION_VIEW_ALL, 'web');
        Permission::findOrCreate('branches.view-all', 'web');

        $this->branchA = Branch::factory()->create(['code' => 'BR-A', 'name' => 'Branch A', 'active' => true]);
        $this->branchB = Branch::factory()->create(['code' => 'BR-B', 'name' => 'Branch B', 'active' => true]);
    }

    private function makeUser(?Branch $branch = null, ?string $role = null): User
    {
        $user = User::factory()->create([
            'branch_id' => $branch?->id,
            'email_verified_at' => now(),
        ]);

        if ($role) {
            $user->assignRole($role);
        }

        return $user->fresh();
    }

    private ?string $contactId = null;

    private function ensureContact(): string
    {
        if ($this->contactId) {
            return $this->contactId;
        }

        // ContactFactory cascades into AccountFactory (self-recursive parent_id)
        // and the Contact model has accounting observers that need a seeded
        // chart of accounts. Insert a minimal row directly to avoid both.
        $id = (string) Str::uuid();

        DB::table('contacts')->insert([
            'id' => $id,
            'name' => 'Test Contact',
            'code' => 'TC-' . Str::random(8),
            'contact_type' => 'customer',
            'active' => true,
            'is_system_generated' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->contactId = $id;
    }

    private function makeInvoice(Branch $branch): Invoice
    {
        $id = (string) Str::uuid();

        DB::table('invoices')->insert([
            'id' => $id,
            'branch_id' => $branch->id,
            'contact_id' => $this->ensureContact(),
            'invoice_no' => 'INV-' . Str::random(10),
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
            'total' => 0,
            'paid_total' => 0,
            'balance_due' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Invoice::find($id);
    }

    private function scope(): BranchScopeService
    {
        return app(BranchScopeService::class);
    }

    private function requestWith(array $query = [], ?User $user = null): Request
    {
        $request = Request::create('/api/invoices', 'GET', $query);

        if ($user) {
            $request->setUserResolver(fn () => $user);
        }

        return $request;
    }

    // ---------------------------------------------------------------------
    // canViewAllBranches matrix
    // ---------------------------------------------------------------------

    public function test_super_admin_role_can_view_all_branches(): void
    {
        $user = $this->makeUser(role: 'Super Admin');
        $this->assertTrue($this->scope()->canViewAllBranches($user));
        $this->assertTrue($user->canViewAllBranches());
    }

    public function test_main_branch_admin_role_can_view_all_branches(): void
    {
        $user = $this->makeUser($this->branchA, 'Main Branch Admin');
        $this->assertTrue($this->scope()->canViewAllBranches($user));
        $this->assertTrue($user->isMainBranchAdminOrAbove());
    }

    public function test_company_owner_role_can_view_all_branches(): void
    {
        $user = $this->makeUser(role: 'Company Owner');
        $this->assertTrue($this->scope()->canViewAllBranches($user));
    }

    public function test_full_access_user_role_can_view_all_branches(): void
    {
        // Created by FullPermissionUserSeeder. Must behave as god-mode.
        $user = $this->makeUser($this->branchA, 'Full Access User');
        $this->assertTrue($this->scope()->canViewAllBranches($user));
    }

    public function test_full_access_admin_role_can_view_all_branches(): void
    {
        $user = $this->makeUser($this->branchA, 'Full Access Admin');
        $this->assertTrue($this->scope()->canViewAllBranches($user));
    }

    public function test_http_full_access_user_can_see_invoices_from_any_branch(): void
    {
        // Reproduction of the regression reported by the user:
        // "Full Access Admin cannot access branch and other records of main branch."
        // Before the fix, removing this role from the Gate::before bypass
        // prevented it from passing permission gates on branch-scoped CRUD.
        $a = $this->makeInvoice($this->branchA);
        $b = $this->makeInvoice($this->branchB);

        // user is anchored to branch A but is a Full Access User — they must
        // still be able to read branch B's records.
        $user = $this->makeUser($this->branchA, 'Full Access User');

        $this->actingAs($user)->getJson("/api/invoices/{$a->id}")->assertOk();
        $this->actingAs($user)->getJson("/api/invoices/{$b->id}")->assertOk();

        $response = $this->actingAs($user)->getJson('/api/invoices');
        $response->assertOk();
        $ids = collect($response->json('results'))->pluck('id')->all();
        $this->assertContains($a->id, $ids);
        $this->assertContains($b->id, $ids);
    }

    public function test_http_full_access_user_can_select_all_via_branch_endpoint(): void
    {
        $user = $this->makeUser($this->branchA, 'Full Access User');

        $this->actingAs($user)
            ->postJson('/api/branch-context/select', ['branch_id' => 'all'])
            ->assertOk();

        $this->actingAs($user)
            ->postJson('/api/branch-context/select', ['branch_id' => $this->branchB->id])
            ->assertOk();
    }

    public function test_branch_admin_role_cannot_view_all_branches(): void
    {
        $user = $this->makeUser($this->branchA, 'Branch Admin');
        $this->assertFalse($this->scope()->canViewAllBranches($user));
        $this->assertTrue($user->isBranchLimited());
    }

    public function test_plain_user_with_no_role_cannot_view_all_branches(): void
    {
        $user = $this->makeUser($this->branchA);
        $this->assertFalse($this->scope()->canViewAllBranches($user));
    }

    public function test_canonical_view_all_permission_grants_access(): void
    {
        $user = $this->makeUser($this->branchA);
        $user->givePermissionTo(BranchScopeService::PERMISSION_VIEW_ALL);
        $this->assertTrue($this->scope()->canViewAllBranches($user->fresh()));
    }

    public function test_legacy_view_all_permission_alias_still_works(): void
    {
        $user = $this->makeUser($this->branchA);
        $user->givePermissionTo('branches.view-all');
        $this->assertTrue($this->scope()->canViewAllBranches($user->fresh()));
    }

    // ---------------------------------------------------------------------
    // accessibleBranchIds — the critical "no head-office fallback" rule
    // ---------------------------------------------------------------------

    public function test_branch_limited_user_accessible_ids_match_assigned_only(): void
    {
        $user = $this->makeUser($this->branchA, 'Branch Admin');
        $accessible = $this->scope()->accessibleBranchIds($user);

        $this->assertSame([(string) $this->branchA->id], $accessible);
        $this->assertNotContains((string) $this->branchB->id, $accessible);
    }

    public function test_branch_limited_user_with_no_assignment_has_zero_accessible_branches(): void
    {
        // Create a head-office branch to prove there's NO silent fallback.
        Branch::factory()->create(['is_head_office' => true, 'active' => true]);

        $user = User::factory()->create(['branch_id' => null, 'email_verified_at' => now()]);
        $user->assignRole('Branch Admin');

        $this->assertSame([], $this->scope()->accessibleBranchIds($user->fresh()));
    }

    public function test_above_branch_user_accessible_ids_include_all_active_branches(): void
    {
        $user = $this->makeUser(role: 'Super Admin');
        $accessible = $this->scope()->accessibleBranchIds($user);

        $this->assertContains((string) $this->branchA->id, $accessible);
        $this->assertContains((string) $this->branchB->id, $accessible);
    }

    // ---------------------------------------------------------------------
    // selectedBranchId — request → assert flow
    // ---------------------------------------------------------------------

    public function test_branch_limited_user_requesting_all_is_forbidden(): void
    {
        $user = $this->makeUser($this->branchA, 'Branch Admin');
        $request = $this->requestWith(['branch_id' => 'all'], $user);

        try {
            $this->scope()->selectedBranchId($request, $user);
            $this->fail('Expected 403 when branch-limited user requests branch_id=all.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
    }

    public function test_branch_limited_user_requesting_other_branch_is_forbidden(): void
    {
        $user = $this->makeUser($this->branchA, 'Branch Admin');
        $request = $this->requestWith(['branch_id' => $this->branchB->id], $user);

        try {
            $this->scope()->selectedBranchId($request, $user);
            $this->fail('Expected 403 when branch-limited user requests another branch.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
    }

    public function test_above_branch_user_can_select_specific_branch(): void
    {
        $user = $this->makeUser(role: 'Main Branch Admin');
        $request = $this->requestWith(['branch_id' => $this->branchB->id], $user);

        $this->assertSame((string) $this->branchB->id, $this->scope()->selectedBranchId($request, $user));
    }

    public function test_above_branch_user_can_select_all_branches(): void
    {
        $user = $this->makeUser(role: 'Main Branch Admin');
        $request = $this->requestWith(['branch_id' => 'all'], $user);

        $this->assertNull($this->scope()->selectedBranchId($request, $user));
        $this->assertSame('all', $this->scope()->selectedBranchMode($request, $user));
    }

    // ---------------------------------------------------------------------
    // applyToQuery
    // ---------------------------------------------------------------------

    public function test_apply_to_query_scopes_branch_limited_user_to_assigned_branch(): void
    {
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchB);

        $user = $this->makeUser($this->branchA, 'Branch Admin');
        $request = $this->requestWith([], $user);

        // Sanity: make sure our role/perm wiring did NOT accidentally grant view-all.
        $this->assertFalse($this->scope()->canViewAllBranches($user), 'Branch Admin must not have view-all.');
        $this->assertSame([(string) $this->branchA->id], $this->scope()->assignedBranchIds($user));

        $query = Invoice::query();
        $this->scope()->applyToQuery($query, $request, $user, 'branch_id', 'invoices');

        $this->assertSame(2, $query->count());
        $this->assertEmpty($query->where('branch_id', $this->branchB->id)->get());
    }

    public function test_apply_to_query_returns_nothing_for_unassigned_branch_limited_user(): void
    {
        Branch::factory()->create(['is_head_office' => true, 'active' => true]);
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchB);

        $user = User::factory()->create(['branch_id' => null, 'email_verified_at' => now()]);
        $user->assignRole('Branch Admin');

        $query = Invoice::query();
        $this->scope()->applyToQuery($query, $this->requestWith([], $user), $user, 'branch_id', 'invoices');

        $this->assertSame(0, $query->count());
    }

    public function test_apply_to_query_for_above_branch_user_with_no_selection_returns_all(): void
    {
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchB);

        $user = $this->makeUser(role: 'Super Admin');
        $query = Invoice::query();
        $this->scope()->applyToQuery($query, $this->requestWith([], $user), $user, 'branch_id', 'invoices');

        $this->assertSame(2, $query->count());
    }

    public function test_apply_to_query_for_above_branch_user_with_specific_selection_scopes(): void
    {
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchB);

        $user = $this->makeUser(role: 'Super Admin');
        $query = Invoice::query();
        $this->scope()->applyToQuery(
            $query,
            $this->requestWith(['branch_id' => $this->branchA->id], $user),
            $user,
            'branch_id',
            'invoices'
        );

        $this->assertSame(1, $query->count());
    }

    // ---------------------------------------------------------------------
    // HTTP-level: BaseCrudApiController + InvoiceController
    // ---------------------------------------------------------------------

    public function test_http_branch_limited_user_index_only_sees_assigned_branch_invoices(): void
    {
        $a1 = $this->makeInvoice($this->branchA);
        $a2 = $this->makeInvoice($this->branchA);
        $b = $this->makeInvoice($this->branchB);

        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $response = $this->actingAs($user)->getJson('/api/invoices');

        $response->assertOk();
        $ids = collect($response->json('results'))->pluck('id')->all();

        $this->assertContains($a1->id, $ids);
        $this->assertContains($a2->id, $ids);
        $this->assertNotContains($b->id, $ids);
    }

    public function test_http_branch_limited_user_cannot_show_other_branch_invoice(): void
    {
        $other = $this->makeInvoice($this->branchB);
        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $this->actingAs($user)
            ->getJson("/api/invoices/{$other->id}")
            ->assertForbidden();
    }

    public function test_http_branch_limited_user_cannot_request_other_branch_via_query_param(): void
    {
        $this->makeInvoice($this->branchB);
        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $this->actingAs($user)
            ->getJson('/api/invoices?branch_id=' . $this->branchB->id)
            ->assertForbidden();
    }

    public function test_http_branch_limited_user_cannot_request_all_branches(): void
    {
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchB);
        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $this->actingAs($user)
            ->getJson('/api/invoices?branch_id=all')
            ->assertForbidden();
    }

    public function test_http_bulk_export_blocks_cross_branch_ids_for_branch_limited_user(): void
    {
        // THIS IS THE LEAK FIX. Before the patch, the user could request the IDs
        // of any branch's records and bulkExport would happily stream them back.
        $own = $this->makeInvoice($this->branchA);
        $other = $this->makeInvoice($this->branchB);

        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $this->actingAs($user)
            ->postJson('/api/invoices/bulk-export', [
                'ids' => [$own->id, $other->id],
            ])
            ->assertForbidden();
    }

    public function test_http_bulk_export_works_for_branch_limited_user_with_own_ids(): void
    {
        $own1 = $this->makeInvoice($this->branchA);
        $own2 = $this->makeInvoice($this->branchA);

        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $response = $this->actingAs($user)
            ->postJson('/api/invoices/bulk-export', [
                'ids' => [$own1->id, $own2->id],
            ]);

        $response->assertOk();
        $this->assertStringStartsWith('text/csv', (string) $response->headers->get('Content-Type'));
    }

    public function test_http_above_branch_user_can_show_invoice_from_any_branch(): void
    {
        $a = $this->makeInvoice($this->branchA);
        $b = $this->makeInvoice($this->branchB);

        $user = $this->makeUser(role: 'Super Admin');

        $this->actingAs($user)->getJson("/api/invoices/{$a->id}")->assertOk();
        $this->actingAs($user)->getJson("/api/invoices/{$b->id}")->assertOk();
    }

    public function test_http_above_branch_user_with_selected_branch_only_sees_that_branch(): void
    {
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchA);
        $this->makeInvoice($this->branchB);

        $user = $this->makeUser(role: 'Super Admin');

        $response = $this->actingAs($user)
            ->getJson('/api/invoices?branch_id=' . $this->branchA->id);

        $response->assertOk();
        $this->assertSame(2, $response->json('count'));
    }

    // ---------------------------------------------------------------------
    // Branch toggle endpoint
    // ---------------------------------------------------------------------

    public function test_branch_limited_user_cannot_select_all_via_endpoint(): void
    {
        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $this->actingAs($user)
            ->postJson('/api/branch-context/select', ['branch_id' => 'all'])
            ->assertForbidden();
    }

    public function test_branch_limited_user_cannot_select_other_branch_via_endpoint(): void
    {
        $user = $this->makeUser($this->branchA, 'Branch Admin');

        $this->actingAs($user)
            ->postJson('/api/branch-context/select', ['branch_id' => $this->branchB->id])
            ->assertForbidden();
    }

    public function test_main_branch_admin_can_select_all_via_endpoint(): void
    {
        $user = $this->makeUser(role: 'Main Branch Admin');

        $this->actingAs($user)
            ->postJson('/api/branch-context/select', ['branch_id' => 'all'])
            ->assertOk();
    }

    public function test_main_branch_admin_can_select_specific_branch_via_endpoint(): void
    {
        $user = $this->makeUser(role: 'Main Branch Admin');

        $this->actingAs($user)
            ->postJson('/api/branch-context/select', ['branch_id' => $this->branchB->id])
            ->assertOk();
    }

    // ---------------------------------------------------------------------
    // Branch auto-code (Phase 1)
    // ---------------------------------------------------------------------

    public function test_branch_code_auto_generated_in_sequence_when_blank(): void
    {
        // setUp() creates BR-A and BR-B; those don't match the BR-### regex so
        // the sequence starts at BR-001.
        $user = $this->makeUser(role: 'Super Admin');

        $first = $this->actingAs($user)->postJson('/api/branches/', [
            'name' => 'Auto One',
        ])->assertCreated();

        $second = $this->actingAs($user)->postJson('/api/branches/', [
            'name' => 'Auto Two',
        ])->assertCreated();

        $codeOne = $first->json('result.code') ?? $first->json('code') ?? $first->json('data.code');
        $codeTwo = $second->json('result.code') ?? $second->json('code') ?? $second->json('data.code');

        $this->assertSame('BR-001', $codeOne);
        $this->assertSame('BR-002', $codeTwo);
    }

    public function test_branch_code_auto_generated_skips_existing_sequence(): void
    {
        Branch::factory()->create(['code' => 'BR-005', 'name' => 'Pre-existing', 'active' => true]);

        $user = $this->makeUser(role: 'Super Admin');

        $response = $this->actingAs($user)->postJson('/api/branches/', [
            'name' => 'After Five',
        ])->assertCreated();

        $code = $response->json('result.code') ?? $response->json('code') ?? $response->json('data.code');
        $this->assertSame('BR-006', $code);
    }

    public function test_explicit_branch_code_is_preserved(): void
    {
        $user = $this->makeUser(role: 'Super Admin');

        $response = $this->actingAs($user)->postJson('/api/branches/', [
            'name' => 'Manual Code',
            'code' => 'CUSTOM-XYZ',
        ])->assertCreated();

        $code = $response->json('result.code') ?? $response->json('code') ?? $response->json('data.code');
        $this->assertSame('CUSTOM-XYZ', $code);
    }

    // ---------------------------------------------------------------------
    // User CRUD branch scoping (Phase 1)
    // ---------------------------------------------------------------------

    public function test_http_branch_limited_user_only_sees_users_in_assigned_branch(): void
    {
        Permission::findOrCreate('hrm.users.view', 'web');

        // Two extra users — one in each branch — that must be filtered correctly.
        $userInA = User::factory()->create(['branch_id' => $this->branchA->id, 'email_verified_at' => now()]);
        $userInB = User::factory()->create(['branch_id' => $this->branchB->id, 'email_verified_at' => now()]);

        $viewer = $this->makeUser($this->branchA, 'Branch Admin');
        $viewer->givePermissionTo('hrm.users.view');
        $viewer = $viewer->fresh();

        $response = $this->actingAs($viewer)->getJson('/api/hrm/users');
        $response->assertOk();

        $ids = collect($response->json('results') ?? $response->json('data') ?? [])
            ->pluck('id')
            ->map(fn ($v) => (string) $v)
            ->all();

        $this->assertContains((string) $userInA->id, $ids);
        $this->assertContains((string) $viewer->id, $ids);
        $this->assertNotContains((string) $userInB->id, $ids);
    }

    public function test_http_branch_limited_user_cannot_create_user_in_other_branch(): void
    {
        Permission::findOrCreate('hrm.users.create', 'web');

        $creator = $this->makeUser($this->branchA, 'Branch Admin');
        $creator->givePermissionTo('hrm.users.create');
        $creator = $creator->fresh();

        $payload = [
            'branch_id' => (string) $this->branchB->id,
            'first_name' => 'Cross',
            'last_name' => 'Branch',
            'username' => 'crossbranch_' . Str::random(6),
            'email' => 'cross_' . Str::random(6) . '@example.test',
            'password' => 'secret123',
        ];

        $this->actingAs($creator)
            ->postJson('/api/hrm/users', $payload)
            ->assertForbidden();
    }
}
