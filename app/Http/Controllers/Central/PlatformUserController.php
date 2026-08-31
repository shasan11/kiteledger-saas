<?php

namespace App\Http\Controllers\Central;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreCentralUserRequest;
use App\Http\Requests\Platform\UpdateCentralUserRequest;
use App\Http\Requests\Platform\UpdatePlatformProfileRequest;
use App\Models\Central\CentralUser;
use App\Models\Central\CentralUserInvitation;
use App\Models\Central\Tenant;
use App\Models\Central\TenantMembership;
use App\Services\SaaS\CentralUserService;
use App\Services\SaaS\PlatformProfileService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;

/**
 * Control-centre management of customer (platform) accounts. Tenant-local users
 * and central administrators are managed elsewhere and are untouched here.
 */
class PlatformUserController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request)
    {
        $this->authorize('viewAny', CentralUser::class);
        $filters = $this->filters($request);

        $users = CentralUser::query()
            ->select(['id', 'uuid', 'name', 'first_name', 'last_name', 'email', 'phone', 'avatar', 'status', 'is_active', 'last_login_at', 'last_active_at', 'created_at'])
            ->with(['tenantMemberships' => fn ($query) => $query->select(['id', 'central_user_id', 'tenant_id', 'role', 'is_active', 'is_primary', 'revoked_at'])->active()->with('tenant:id,company_name')])
            ->withCount(['tenantMemberships as tenant_count' => fn ($query) => $query->active()])
            ->when($filters['search'], fn ($query, $search) => $query->where(fn ($inner) => $inner
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhereHas('tenants', fn ($tenants) => $tenants->where('company_name', 'like', "%{$search}%"))))
            ->when($filters['status'], fn ($query, $status) => $query->where('status', $status))
            ->when($filters['tenant_id'], fn ($query, $tenantId) => $query->whereHas('tenantMemberships', fn ($m) => $m->active()->where('tenant_id', $tenantId)))
            ->when($filters['role'], fn ($query, $role) => $query->whereHas('tenantMemberships', fn ($m) => $m->active()->where('role', $role)))
            ->when($filters['created_from'], fn ($query, $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['created_to'], fn ($query, $to) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('Central/Users/Index', [
            'users' => $users,
            'filters' => $filters,
            'stats' => $this->stats(),
            'tenantOptions' => Tenant::query()->orderBy('company_name')->get(['id', 'company_name']),
            'roleOptions' => TenantMembershipRole::options(),
            'statusOptions' => PlatformUserStatus::values(),
            'can' => $this->abilities($request),
        ]);
    }

    public function show(Request $request, CentralUser $platformUser)
    {
        $this->authorize('view', $platformUser);
        $platformUser->load([
            'profile',
            'tenantMemberships' => fn ($query) => $query->with([
                'tenant:id,company_name,status,currency,country,timezone,legal_name,owner_name,owner_email,owner_phone,address,plan_id',
                'tenant.plan:id,name,slug,price_monthly,price_yearly,currency',
                // Qualified: subscription() is a latestOfMany relation, so bare
                // column names collide with its aggregate sub-join.
                'tenant.subscription:subscriptions.id,subscriptions.tenant_id,subscriptions.plan_id,subscriptions.status,subscriptions.billing_cycle,subscriptions.current_period_ends_at',
                'tenant.subscription.plan:id,name',
            ])->orderByDesc('is_primary')->orderBy('id'),
        ]);
        $tenantIds = $platformUser->tenantMemberships->pluck('tenant_id')->all();
        $invoiceCounts = DB::connection(config('tenancy.database.central_connection'))
            ->table('tenant_invoices')->whereIn('tenant_id', $tenantIds)->whereNull('deleted_at')
            ->select('tenant_id', DB::raw('count(*) as total'))->groupBy('tenant_id')->pluck('total', 'tenant_id');

        return Inertia::render('Central/Users/Show', [
            'platformUser' => $platformUser,
            'invoiceCounts' => $invoiceCounts,
            'invitations' => CentralUserInvitation::where('email', $platformUser->email)->with('tenant:id,company_name')->latest('id')->get()->map(fn (CentralUserInvitation $invitation): array => [
                'id' => $invitation->id, 'tenant' => $invitation->tenant?->company_name, 'role' => $invitation->role?->value,
                'status' => $invitation->status(), 'expires_at' => $invitation->expires_at, 'created_at' => $invitation->created_at,
            ]),
            'activity' => $this->activity($platformUser),
            'assignableTenants' => Tenant::query()->whereNotIn('id', $tenantIds)->orderBy('company_name')->get(['id', 'company_name']),
            'roleOptions' => TenantMembershipRole::options(),
            'statusOptions' => PlatformUserStatus::values(),
            'permissionKeys' => TenantMembership::PERMISSIONS,
            'can' => $this->abilities($request),
        ]);
    }

    public function store(StoreCentralUserRequest $request, CentralUserService $service)
    {
        $user = $service->create(
            $request->safe()->except(['memberships', 'password_confirmation']),
            $request->membershipAssignments(),
            $request->user('central'),
            $request->boolean('send_invitation'),
        );

        return redirect()->route('central.platform-users.show', $user)->with('success', 'Platform user created.');
    }

    public function update(UpdateCentralUserRequest $request, CentralUser $platformUser, CentralUserService $service)
    {
        $service->update($platformUser, $request->safe()->except(['password_confirmation']));

        return back()->with('success', 'Platform user updated.');
    }

    public function updateProfile(UpdatePlatformProfileRequest $request, CentralUser $platformUser, PlatformProfileService $service)
    {
        $service->update($platformUser, $request->validated());

        return back()->with('success', 'Profile updated.');
    }

    public function security(Request $request, CentralUser $platformUser, CentralUserService $service, PlatformSettingsService $settings)
    {
        $this->authorize('suspend', $platformUser);
        $action = $request->validate(['action' => ['required', 'in:suspend,activate,disable,force_password_reset,clear_password_reset,send_password_reset,sign_out_sessions']])['action'];
        if ($action === 'send_password_reset') {
            $settings->applyMailConfiguration();
        }

        match ($action) {
            'suspend' => $service->setStatus($platformUser, PlatformUserStatus::Suspended),
            'activate' => $service->setStatus($platformUser, PlatformUserStatus::Active),
            'disable' => $service->setStatus($platformUser, PlatformUserStatus::Disabled),
            'force_password_reset' => $service->requirePasswordReset($platformUser),
            'clear_password_reset' => $service->requirePasswordReset($platformUser, false),
            'sign_out_sessions' => $service->signOutEverywhere($platformUser),
            'send_password_reset' => Password::broker('platform_users')->sendResetLink(['email' => $platformUser->email]),
        };

        return back()->with('success', 'Account security updated.');
    }

    /**
     * @return array{search: ?string, status: ?string, tenant_id: ?string, role: ?string, created_from: ?string, created_to: ?string}
     */
    private function filters(Request $request): array
    {
        return [
            'search' => $request->string('search')->trim()->value() ?: null,
            'status' => in_array($request->string('status')->value(), PlatformUserStatus::values(), true) ? $request->string('status')->value() : null,
            'tenant_id' => $request->string('tenant_id')->value() ?: null,
            'role' => in_array($request->string('role')->value(), TenantMembershipRole::values(), true) ? $request->string('role')->value() : null,
            'created_from' => $request->date('created_from')?->toDateString(),
            'created_to' => $request->date('created_to')?->toDateString(),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        $counts = CentralUser::query()->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status');

        return [
            'total' => (int) $counts->sum(),
            'active' => (int) $counts->get(PlatformUserStatus::Active->value, 0),
            'invited' => (int) $counts->get(PlatformUserStatus::Invited->value, 0),
            'suspended' => (int) $counts->get(PlatformUserStatus::Suspended->value, 0),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function activity(CentralUser $user): array
    {
        return DB::connection(config('tenancy.database.central_connection'))->table('central_audit_logs')
            ->where(fn ($query) => $query->where('platform_user_id', $user->id)->orWhere(fn ($inner) => $inner->where('model_type', $user->getMorphClass())->where('model_id', (string) $user->id)))
            ->orderByDesc('id')->limit(50)
            ->get(['id', 'action', 'tenant_id', 'model_type', 'ip_address', 'created_at'])
            ->map(fn ($row): array => (array) $row)->all();
    }

    /**
     * @return array<string, bool>
     */
    private function abilities(Request $request): array
    {
        $admin = $request->user('central');

        return [
            'create' => (bool) $admin?->can('platform-users.create'),
            'update' => (bool) $admin?->can('platform-users.update'),
            'suspend' => (bool) $admin?->can('platform-users.suspend'),
            'manageMemberships' => (bool) $admin?->can('tenant-memberships.manage'),
        ];
    }
}
