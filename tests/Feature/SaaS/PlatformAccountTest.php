<?php

namespace Tests\Feature\SaaS;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralUser;
use App\Models\Central\CentralUserInvitation;
use App\Models\Central\Plan;
use App\Models\Central\OrganizationRequest;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Models\Central\TenantInvoice;
use App\Models\Central\TenantMembership;
use App\Services\SaaS\PlatformInvitationService;
use App\Services\SaaS\TenantAccessService;
use App\Services\SaaS\TenantMembershipService;
use Database\Seeders\CentralRolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PlatformAccountTest extends TestCase
{
    use RefreshDatabase;

    private const HOST = 'http://central.test';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(CentralRolesAndPermissionsSeeder::class);
    }

    // ---------------------------------------------------------------- helpers

    private function tenant(string $id, string $name): Tenant
    {
        return Tenant::create([
            'id' => $id, 'company_name' => $name, 'owner_name' => 'Owner', 'owner_email' => $id.'@example.test',
            'status' => 'active', 'timezone' => 'UTC', 'currency' => 'USD',
        ]);
    }

    private function platformUser(string $email = 'shasan@example.com', array $attributes = []): CentralUser
    {
        $user = CentralUser::create(array_merge([
            'uuid' => (string) Str::uuid(), 'name' => 'Shasan Dhakal', 'first_name' => 'Shasan', 'last_name' => 'Dhakal',
            'email' => $email, 'password' => 'super-secret-password', 'status' => PlatformUserStatus::Active->value, 'is_active' => true,
        ], $attributes));
        $user->profile()->create([]);

        return $user;
    }

    private function membership(CentralUser $user, Tenant $tenant, TenantMembershipRole $role, array $permissions = [], bool $primary = false): TenantMembership
    {
        return app(TenantMembershipService::class)->assign($user, $tenant, $role, $permissions, null, $primary);
    }

    private function admin(string $role = 'super_administrator'): CentralAdmin
    {
        $admin = CentralAdmin::create(['name' => 'Op', 'email' => $role.'@kiteledger.test', 'password' => Hash::make('password-1234'), 'role' => $role === 'super_administrator' ? 'super_admin' : 'operator', 'is_active' => true]);
        $admin->roles()->sync([\App\Models\Central\CentralRole::where('name', $role)->value('id')]);

        return $admin;
    }

    private function signIn(CentralUser $user): void
    {
        $this->actingAs($user, 'platform')->withSession(['platform_login_at' => now()->getTimestamp()]);
    }

    // -------------------------------------------------------- platform users

    public function test_central_admin_can_create_a_platform_user_with_memberships(): void
    {
        $this->tenant('kuberbytes', 'Kuberbytes');
        $response = $this->actingAs($this->admin(), 'central')->post(self::HOST.'/superadmin/platform-users', [
            'first_name' => 'Shasan', 'last_name' => 'Dhakal', 'email' => 'shasan@example.com',
            'password' => 'super-secret-password', 'password_confirmation' => 'super-secret-password', 'is_active' => true,
            'memberships' => [['tenant_id' => 'kuberbytes', 'role' => 'owner', 'is_primary' => true]],
        ]);

        $response->assertRedirect();
        $user = CentralUser::where('email', 'shasan@example.com')->firstOrFail();
        $this->assertDatabaseHas('central_user_profiles', ['central_user_id' => $user->id]);
        $membership = $user->tenantMemberships()->first();
        $this->assertSame(TenantMembershipRole::Owner, $membership->role);
        $this->assertTrue($membership->is_primary);
        $this->assertTrue($membership->can_manage_plan);
    }

    public function test_duplicate_platform_user_email_is_rejected(): void
    {
        $this->platformUser();
        $this->actingAs($this->admin(), 'central')
            ->post(self::HOST.'/superadmin/platform-users', [
                'first_name' => 'Other', 'last_name' => 'Person', 'email' => 'shasan@example.com',
                'password' => 'super-secret-password', 'password_confirmation' => 'super-secret-password',
            ])
            ->assertSessionHasErrors('email');
    }

    public function test_inactive_platform_user_cannot_sign_in(): void
    {
        $this->platformUser(attributes: ['status' => PlatformUserStatus::Suspended->value, 'is_active' => false]);
        $this->post(self::HOST.'/account/login', ['email' => 'shasan@example.com', 'password' => 'super-secret-password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest('platform');
    }

    public function test_active_platform_user_can_sign_in_and_stamps_login_metadata(): void
    {
        $user = $this->platformUser();
        $this->post(self::HOST.'/account/login', ['email' => 'shasan@example.com', 'password' => 'super-secret-password'])
            ->assertRedirect(self::HOST.'/account');
        $this->assertAuthenticatedAs($user, 'platform');
        $this->assertNotNull($user->refresh()->last_login_at);
        $this->assertNotNull($user->last_login_ip);
    }

    public function test_platform_user_can_update_their_own_profile(): void
    {
        $user = $this->platformUser();
        $this->signIn($user);
        $this->put(self::HOST.'/account/profile', ['first_name' => 'Shasan', 'last_name' => 'D', 'job_title' => 'CEO', 'city' => 'Kathmandu'])
            ->assertRedirect();
        $this->assertDatabaseHas('central_user_profiles', ['central_user_id' => $user->id, 'job_title' => 'CEO', 'city' => 'Kathmandu']);
    }

    public function test_platform_user_can_submit_and_track_an_organization_request(): void
    {
        $user = $this->platformUser();
        $other = $this->platformUser('other@example.com');
        OrganizationRequest::create(['central_user_id' => $other->id, 'company_name' => 'Hidden Company', 'contact_email' => $other->email, 'status' => 'pending']);
        $this->signIn($user);

        $this->post(self::HOST.'/account/requests', [
            'company_name' => 'New Horizon LLC', 'legal_name' => 'New Horizon Limited',
            'contact_email' => $user->email, 'country' => 'AE', 'notes' => 'Two branches.',
        ])->assertRedirect(self::HOST.'/account/requests');

        $this->assertDatabaseHas('central_organization_requests', ['central_user_id' => $user->id, 'company_name' => 'New Horizon LLC', 'status' => 'pending']);
        $response = $this->get(self::HOST.'/account/requests')->assertOk();
        $requests = collect($response->viewData('page')['props']['requests']);
        $this->assertSame(['New Horizon LLC'], $requests->pluck('company_name')->all());
    }

    // ----------------------------------------------------------- memberships

    public function test_a_user_can_belong_to_two_tenants(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner, primary: true);
        $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);

        $this->assertEqualsCanonicalizing(['Kuberbytes', 'Cortifox'], $user->tenants()->pluck('company_name')->all());
        $this->assertTrue($user->canManageTenantPlan('kuberbytes'));
        $this->assertFalse($user->canManageTenantPlan('cortifox'));
        $this->assertTrue($user->canManageTenantBilling('cortifox'));
    }

    public function test_duplicate_membership_is_rejected(): void
    {
        $user = $this->platformUser();
        $tenant = $this->tenant('kuberbytes', 'Kuberbytes');
        $this->membership($user, $tenant, TenantMembershipRole::Owner);

        $this->expectException(ValidationException::class);
        $this->membership($user, $tenant, TenantMembershipRole::Member);
    }

    public function test_membership_can_be_revoked_and_history_is_kept(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner);
        $membership = $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);

        app(TenantMembershipService::class)->revoke($membership, 'left the company');

        $this->assertDatabaseHas('central_user_tenant_memberships', ['id' => $membership->id, 'is_active' => false]);
        $this->assertNotNull($membership->refresh()->revoked_at);
        $user->forgetMembershipCache();
        $this->assertFalse($user->canAccessTenant('cortifox'));
    }

    public function test_only_one_primary_membership_exists_and_revoking_promotes_a_replacement(): void
    {
        $user = $this->platformUser();
        $first = $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner, primary: true);
        $second = $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);

        app(TenantMembershipService::class)->setPrimary($user, $second);
        $this->assertFalse($first->refresh()->is_primary);
        $this->assertTrue($second->refresh()->is_primary);
        $this->assertSame(1, TenantMembership::where('central_user_id', $user->id)->where('is_primary', true)->count());

        app(TenantMembershipService::class)->revoke($second);
        $this->assertTrue($first->refresh()->is_primary);
    }

    public function test_the_last_owner_of_a_tenant_cannot_be_revoked_or_demoted(): void
    {
        $user = $this->platformUser();
        $membership = $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner);
        $service = app(TenantMembershipService::class);

        try {
            $service->revoke($membership);
            $this->fail('Revoking the last owner should fail.');
        } catch (ValidationException $exception) {
            $this->assertStringContainsString('last active owner', $exception->getMessage());
        }

        $this->expectException(ValidationException::class);
        $service->updatePermissions($membership, TenantMembershipRole::Member);
    }

    public function test_ownership_can_be_transferred_before_the_previous_owner_leaves(): void
    {
        $tenant = $this->tenant('kuberbytes', 'Kuberbytes');
        $first = $this->membership($this->platformUser(), $tenant, TenantMembershipRole::Owner);
        $this->membership($this->platformUser('second@example.com'), $tenant, TenantMembershipRole::Owner);

        app(TenantMembershipService::class)->revoke($first);
        $this->assertFalse($first->refresh()->is_active);
    }

    // --------------------------------------------------------- authorization

    public function test_platform_user_can_open_an_assigned_tenant_but_not_an_unassigned_one(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner, primary: true);
        $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);
        $this->tenant('acme-corp', 'Acme');
        $this->signIn($user);

        $this->get(self::HOST.'/account/tenants/kuberbytes')->assertOk();
        $this->get(self::HOST.'/account/tenants/cortifox')->assertOk();
        $this->get(self::HOST.'/account/tenants/acme-corp')->assertForbidden();
    }

    public function test_every_tenant_scoped_endpoint_denies_an_unassigned_tenant(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner, primary: true);
        $this->tenant('acme-corp', 'Acme');
        $this->signIn($user);

        foreach (['', '/settings', '/members', '/billing'] as $path) {
            $this->get(self::HOST.'/account/tenants/acme-corp'.$path)->assertForbidden();
        }
        $this->post(self::HOST.'/account/tenants/switch', ['tenant_id' => 'acme-corp'])->assertForbidden();
        $this->put(self::HOST.'/account/tenants/acme-corp/settings', ['company_name' => 'Hacked', 'owner_name' => 'X', 'owner_email' => 'x@example.test'])->assertForbidden();
    }

    public function test_a_revoked_membership_cannot_access_the_tenant(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner);
        $membership = $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);
        app(TenantMembershipService::class)->revoke($membership);
        $this->signIn($user);

        $this->get(self::HOST.'/account/tenants/cortifox')->assertForbidden();
    }

    public function test_an_active_tenant_is_cleared_from_the_session_once_access_is_revoked(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner);
        $membership = $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);
        $this->actingAs($user, 'platform')->withSession(['platform_login_at' => now()->getTimestamp(), 'platform_active_tenant_id' => 'cortifox']);

        app(TenantMembershipService::class)->revoke($membership);
        $this->get(self::HOST.'/account')->assertRedirect(self::HOST.'/account/tenants')->assertSessionMissing('platform_active_tenant_id');
    }

    // -------------------------------------------------------------- billing

    public function test_billing_screens_are_scoped_to_the_membership_tenant(): void
    {
        $plan = Plan::create(['name' => 'Professional', 'slug' => 'professional', 'price_monthly' => 49, 'price_yearly' => 490, 'currency' => 'USD', 'is_active' => true]);
        $kuberbytes = $this->tenant('kuberbytes', 'Kuberbytes');
        $cortifox = $this->tenant('cortifox', 'Cortifox');
        Subscription::create(['tenant_id' => $kuberbytes->id, 'plan_id' => $plan->id, 'status' => 'active', 'billing_cycle' => 'monthly', 'starts_at' => now(), 'current_period_starts_at' => now(), 'current_period_ends_at' => now()->addMonth()]);
        TenantInvoice::create(['invoice_number' => 'INV-00012', 'tenant_id' => $kuberbytes->id, 'plan_id' => $plan->id, 'total' => 49, 'currency' => 'USD', 'status' => 'issued']);
        TenantInvoice::create(['invoice_number' => 'INV-00099', 'tenant_id' => $cortifox->id, 'plan_id' => $plan->id, 'total' => 20, 'currency' => 'USD', 'status' => 'issued']);

        $user = $this->platformUser();
        $this->membership($user, $kuberbytes, TenantMembershipRole::BillingManager);
        $this->signIn($user);

        $response = $this->get(self::HOST.'/account/tenants/kuberbytes/billing');
        $response->assertOk();
        $numbers = collect($response->viewData('page')['props']['invoices']['data'])->pluck('invoice_number');
        $this->assertTrue($numbers->contains('INV-00012'));
        $this->assertFalse($numbers->contains('INV-00099'));

        $this->get(self::HOST.'/account/tenants/cortifox/billing')->assertForbidden();
    }

    public function test_global_invoice_list_only_contains_permitted_organizations(): void
    {
        $allowed = $this->tenant('allowed', 'Allowed Company');
        $hidden = $this->tenant('hidden', 'Hidden Company');
        TenantInvoice::create(['invoice_number' => 'INV-ALLOWED', 'tenant_id' => $allowed->id, 'total' => 49, 'currency' => 'USD', 'status' => 'issued']);
        TenantInvoice::create(['invoice_number' => 'INV-PAID', 'tenant_id' => $allowed->id, 'total' => 29, 'currency' => 'USD', 'status' => 'paid']);
        TenantInvoice::create(['invoice_number' => 'INV-HIDDEN', 'tenant_id' => $hidden->id, 'total' => 99, 'currency' => 'USD', 'status' => 'issued']);

        $user = $this->platformUser();
        $this->membership($user, $allowed, TenantMembershipRole::BillingManager);
        $this->membership($user, $hidden, TenantMembershipRole::Member);
        $this->signIn($user);

        $response = $this->get(self::HOST.'/account/invoices')->assertOk();
        $numbers = collect($response->viewData('page')['props']['invoices']['data'])->pluck('invoice_number');
        $this->assertTrue($numbers->contains('INV-ALLOWED'));
        $this->assertFalse($numbers->contains('INV-PAID'));
        $this->assertFalse($numbers->contains('INV-HIDDEN'));

        $paid = $this->get(self::HOST.'/account/invoices?status=paid')->assertOk();
        $paidNumbers = collect($paid->viewData('page')['props']['invoices']['data'])->pluck('invoice_number');
        $this->assertTrue($paidNumbers->contains('INV-PAID'));
        $this->assertFalse($paidNumbers->contains('INV-ALLOWED'));
        $this->assertSame('paid', $paid->viewData('page')['props']['filter']);
    }

    public function test_a_user_without_billing_permission_is_refused(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Member);
        $this->signIn($user);

        $this->get(self::HOST.'/account/tenants/kuberbytes/billing')->assertForbidden();
    }

    public function test_plan_changes_require_the_plan_permission(): void
    {
        $plan = Plan::create(['name' => 'Starter', 'slug' => 'starter', 'price_monthly' => 10, 'price_yearly' => 100, 'currency' => 'USD', 'is_active' => true]);
        $upgrade = Plan::create(['name' => 'Professional', 'slug' => 'professional', 'price_monthly' => 49, 'price_yearly' => 490, 'currency' => 'USD', 'is_active' => true]);
        $tenant = $this->tenant('kuberbytes', 'Kuberbytes');
        $subscription = Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'active', 'billing_cycle' => 'monthly', 'starts_at' => now(), 'current_period_starts_at' => now(), 'current_period_ends_at' => now()->addMonth()]);

        $administrator = $this->platformUser('admin@example.com');
        $this->membership($administrator, $tenant, TenantMembershipRole::Administrator);
        $this->signIn($administrator);
        $this->post(self::HOST.'/account/tenants/kuberbytes/billing/plan', ['plan_id' => $upgrade->id, 'timing' => 'immediate'])->assertForbidden();

        $owner = $this->platformUser('owner@example.com');
        $this->membership($owner, $tenant, TenantMembershipRole::Owner);
        $this->signIn($owner);
        $this->post(self::HOST.'/account/tenants/kuberbytes/billing/plan', ['plan_id' => $upgrade->id, 'timing' => 'immediate'])->assertRedirect();
        $this->assertSame($upgrade->id, $subscription->refresh()->plan_id);
    }

    // --------------------------------------------------------- central admin

    public function test_super_admin_can_list_platform_users_and_an_unauthorised_role_cannot(): void
    {
        $this->platformUser();
        $this->actingAs($this->admin(), 'central')->get(self::HOST.'/superadmin/platform-users')->assertOk();
        $this->actingAs($this->admin('content_manager'), 'central')->get(self::HOST.'/superadmin/platform-users')->assertForbidden();
    }

    public function test_central_admin_can_suspend_a_platform_user_and_sign_them_out(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner);
        $this->actingAs($this->admin(), 'central')->post(self::HOST.'/superadmin/platform-users/'.$user->id.'/security', ['action' => 'suspend'])->assertRedirect();

        $this->assertSame(PlatformUserStatus::Suspended, $user->refresh()->status);
        $this->signIn($user);
        $this->get(self::HOST.'/account')->assertRedirect(self::HOST.'/account/login');
    }

    public function test_signing_out_all_sessions_invalidates_older_sessions(): void
    {
        $user = $this->platformUser();
        $this->actingAs($user, 'platform')->withSession(['platform_login_at' => now()->subHour()->getTimestamp()]);
        $user->forceFill(['sessions_invalidated_at' => now()])->save();

        $this->get(self::HOST.'/account')->assertRedirect(self::HOST.'/account/login');
    }

    // ---------------------------------------------------------- invitations

    public function test_an_invitation_creates_an_account_and_membership_without_a_default_password(): void
    {
        $tenant = $this->tenant('kuberbytes', 'Kuberbytes');
        $invitations = app(PlatformInvitationService::class);
        $invitation = $invitations->invite($tenant, 'new@example.com', TenantMembershipRole::Member);

        $this->assertDatabaseMissing('central_user_invitations', ['token_hash' => null]);
        $this->assertSame(64, strlen($invitation->token_hash));

        $token = $this->tokenFor($invitation);
        $this->post(self::HOST.'/account/invitations', [
            'token' => $token, 'first_name' => 'New', 'last_name' => 'Person',
            'password' => 'super-secret-password', 'password_confirmation' => 'super-secret-password',
        ])->assertRedirect(self::HOST.'/account');

        $user = CentralUser::where('email', 'new@example.com')->firstOrFail();
        $this->assertTrue($user->canAccessTenant('kuberbytes'));
        $this->assertSame(PlatformUserStatus::Active, $user->status);
    }

    public function test_inviting_an_existing_account_attaches_a_membership_instead_of_duplicating_the_user(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner);
        $cortifox = $this->tenant('cortifox', 'Cortifox');

        $invitation = app(PlatformInvitationService::class)->invite($cortifox, $user->email, TenantMembershipRole::BillingManager);
        $this->post(self::HOST.'/account/invitations', ['token' => $this->tokenFor($invitation)])->assertRedirect(self::HOST.'/account/login');

        $this->assertSame(1, CentralUser::where('email', $user->email)->count());
        $user->forgetMembershipCache();
        $this->assertTrue($user->canManageTenantBilling('cortifox'));
    }

    // ------------------------------------------------------------- isolation

    public function test_tenant_access_service_only_returns_assigned_tenants(): void
    {
        $user = $this->platformUser();
        $this->membership($user, $this->tenant('kuberbytes', 'Kuberbytes'), TenantMembershipRole::Owner, primary: true);
        $this->membership($user, $this->tenant('cortifox', 'Cortifox'), TenantMembershipRole::Administrator);
        $this->tenant('acme-corp', 'Acme');

        $access = app(TenantAccessService::class);
        $this->assertSame(['Kuberbytes', 'Cortifox'], $access->getAccessibleTenants($user)->pluck('company_name')->all());
        $this->assertNull($access->resolveAccessibleTenant($user, 'acme-corp'));
        $this->assertNotNull($access->resolveAccessibleTenant($user, 'cortifox'));
    }

    /**
     * The service stores only the hash, so tests re-derive a matching token by
     * inviting through a deterministic double.
     */
    private function tokenFor(CentralUserInvitation $invitation): string
    {
        $token = Str::random(64);
        $invitation->forceFill(['token_hash' => hash('sha256', $token)])->save();

        return $token;
    }
}
