<?php

namespace App\Services\SaaS;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use App\Models\Central\CentralUser;
use App\Models\Central\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creation and lifecycle of platform accounts. Membership changes are delegated
 * to TenantMembershipService so ownership rules are never bypassed.
 */
class CentralUserService
{
    public function __construct(
        private readonly TenantMembershipService $memberships,
        private readonly PlatformInvitationService $invitations,
        private readonly CentralAuditService $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $data  Validated payload only.
     * @param  array<int, array{tenant_id: string, role: string, is_primary?: bool, permissions?: array<string, bool>}>  $tenantAssignments
     */
    public function create(array $data, array $tenantAssignments = [], ?Model $actor = null, bool $invite = false): CentralUser
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($data, $tenantAssignments, $actor, $invite): CentralUser {
            $user = CentralUser::create([
                'uuid' => (string) Str::uuid(),
                'name' => $data['name'] ?? trim(($data['first_name'] ?? '').' '.($data['last_name'] ?? '')),
                'first_name' => $data['first_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $invite ? null : ($data['password'] ?? null),
                'password_changed_at' => $invite ? null : now(),
                'timezone' => $data['timezone'] ?? 'UTC',
                'locale' => $data['locale'] ?? null,
                'country' => $data['country'] ?? null,
                'status' => $invite ? PlatformUserStatus::Invited->value : ($data['status'] ?? PlatformUserStatus::Active->value),
                'is_active' => $invite ? false : (bool) ($data['is_active'] ?? true),
            ]);
            $user->profile()->create([]);

            foreach ($tenantAssignments as $assignment) {
                $tenant = Tenant::findOrFail($assignment['tenant_id']);
                $role = TenantMembershipRole::from($assignment['role']);
                if ($invite) {
                    $this->invitations->invite($tenant, $user->email, $role, $assignment['permissions'] ?? [], $actor);

                    continue;
                }
                $this->memberships->assign($user, $tenant, $role, $assignment['permissions'] ?? [], $actor, (bool) ($assignment['is_primary'] ?? false));
            }

            $this->audit->log(request(), 'platform-user.created', $user, [], $this->snapshot($user));

            return $user->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(CentralUser $user, array $data): CentralUser
    {
        $old = $this->snapshot($user);
        $user->fill(collect($data)->only(['first_name', 'last_name', 'name', 'email', 'phone', 'status', 'is_active', 'timezone', 'locale', 'country'])->all());
        if (blank($user->name)) {
            $user->name = trim($user->first_name.' '.$user->last_name) ?: $user->email;
        }
        if (! blank($data['password'] ?? null)) {
            $user->password = $data['password'];
            $user->password_changed_at = now();
            $user->force_password_reset = false;
        }
        $user->save();
        $this->audit->log(request(), 'platform-user.updated', $user, $old, $this->snapshot($user));

        return $user;
    }

    public function setStatus(CentralUser $user, PlatformUserStatus $status): CentralUser
    {
        $old = $this->snapshot($user);
        $user->forceFill([
            'status' => $status->value,
            'is_active' => $status->canSignIn(),
            'sessions_invalidated_at' => $status->canSignIn() ? $user->sessions_invalidated_at : now(),
        ])->save();
        $this->audit->log(request(), $status === PlatformUserStatus::Suspended ? 'platform-user.suspended' : 'platform-user.updated', $user, $old, $this->snapshot($user));

        return $user;
    }

    /** Invalidates every existing browser session for this account. */
    public function signOutEverywhere(CentralUser $user): CentralUser
    {
        $user->forceFill(['sessions_invalidated_at' => now(), 'remember_token' => null])->save();
        $this->audit->log(request(), 'platform-user.sessions_revoked', $user);

        return $user;
    }

    public function requirePasswordReset(CentralUser $user, bool $required = true): CentralUser
    {
        $user->forceFill(['force_password_reset' => $required])->save();
        $this->audit->log(request(), 'platform-user.force_password_reset', $user, [], ['force_password_reset' => $required]);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(CentralUser $user): array
    {
        return [
            'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone,
            'status' => $user->status?->value, 'is_active' => $user->is_active,
        ];
    }
}
