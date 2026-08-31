<?php

namespace App\Services\SaaS;

use App\Enums\PlatformUserStatus;
use App\Enums\TenantMembershipRole;
use App\Models\Central\CentralUser;
use App\Models\Central\CentralUserInvitation;
use App\Models\Central\Tenant;
use App\Models\Central\TenantMembership;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Invitation flow: an emailed one-time token, never a default password. Only the
 * token hash is persisted. Accepting creates (or reuses) the platform account
 * and attaches the tenant membership.
 */
class PlatformInvitationService
{
    public function __construct(private readonly CentralAuditService $audit) {}

    /**
     * @param  array<string, bool>  $permissions
     */
    public function invite(Tenant $tenant, string $email, TenantMembershipRole $role, array $permissions = [], ?Model $actor = null): CentralUserInvitation
    {
        $email = mb_strtolower(trim($email));
        $existing = CentralUser::where('email', $email)->first();
        if ($existing && TenantMembership::where('central_user_id', $existing->id)->where('tenant_id', $tenant->getKey())->active()->exists()) {
            throw ValidationException::withMessages(['email' => 'That person already has access to '.$tenant->company_name.'.']);
        }
        if (CentralUserInvitation::where('email', $email)->where('tenant_id', $tenant->getKey())->pending()->exists()) {
            throw ValidationException::withMessages(['email' => 'An invitation for that email is already pending for this company.']);
        }

        $token = Str::random(64);
        $invitation = CentralUserInvitation::create([
            'email' => $email,
            'tenant_id' => $tenant->getKey(),
            'role' => $role->value,
            'permissions' => app(TenantMembershipService::class)->resolvePermissions($role, $permissions),
            'token_hash' => hash('sha256', $token),
            'invited_by_type' => $actor?->getMorphClass(),
            'invited_by_id' => (string) $actor?->getKey(),
            'expires_at' => now()->addDays(14),
        ]);

        $this->send($invitation, $tenant, $token);
        $this->audit->log(request(), 'platform-user.invited', $invitation, [], ['email' => $email, 'role' => $role->value], ['tenant_id' => $tenant->getKey()]);

        return $invitation;
    }

    public function findByToken(string $token): ?CentralUserInvitation
    {
        return CentralUserInvitation::with('tenant:id,company_name')->where('token_hash', hash('sha256', $token))->pending()->first();
    }

    /**
     * Accept an invitation. An existing account keeps its password and simply
     * gains the new membership; a new account sets its password here.
     */
    public function accept(CentralUserInvitation $invitation, array $data): CentralUser
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($invitation, $data): CentralUser {
            $tenant = Tenant::findOrFail($invitation->tenant_id);
            $user = CentralUser::where('email', $invitation->email)->first();
            if (! $user) {
                $user = CentralUser::create([
                    'uuid' => (string) Str::uuid(),
                    'name' => trim(($data['first_name'] ?? '').' '.($data['last_name'] ?? '')) ?: $invitation->email,
                    'first_name' => $data['first_name'] ?? null,
                    'last_name' => $data['last_name'] ?? null,
                    'email' => $invitation->email,
                    'password' => $data['password'],
                    'password_changed_at' => now(),
                    'email_verified_at' => now(),
                    'status' => PlatformUserStatus::Active->value,
                    'is_active' => true,
                ]);
                $user->profile()->create([]);
            } elseif ($user->status === PlatformUserStatus::Invited) {
                $user->forceFill([
                    'password' => $data['password'],
                    'password_changed_at' => now(),
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'status' => PlatformUserStatus::Active->value,
                    'is_active' => true,
                ])->save();
            }

            $membership = TenantMembership::where('central_user_id', $user->id)->where('tenant_id', $tenant->getKey())->first();
            if ($membership) {
                app(TenantMembershipService::class)->restore($membership);
            } else {
                app(TenantMembershipService::class)->assign($user, $tenant, $invitation->role, $invitation->permissions ?? [], null);
            }
            $invitation->forceFill(['accepted_at' => now()])->save();
            $this->audit->log(request(), 'platform-user.invitation_accepted', $invitation, [], ['email' => $invitation->email], ['tenant_id' => $tenant->getKey()]);

            return $user->refresh();
        });
    }

    public function revoke(CentralUserInvitation $invitation): CentralUserInvitation
    {
        $invitation->forceFill(['revoked_at' => now()])->save();
        $this->audit->log(request(), 'platform-user.invitation_revoked', $invitation, [], ['email' => $invitation->email], ['tenant_id' => $invitation->tenant_id]);

        return $invitation;
    }

    private function send(CentralUserInvitation $invitation, Tenant $tenant, string $token): void
    {
        try {
            app(PlatformSettingsService::class)->applyMailConfiguration();
            $url = route('central.account.invitations.show', ['token' => $token]);
            Mail::html(
                '<p>You have been invited to join <strong>'.e($tenant->company_name).'</strong> on KiteLedger.</p>'
                .'<p><a href="'.e($url).'">Accept your invitation</a></p>'
                .'<p>This invitation expires on '.$invitation->expires_at->toDayDateTimeString().'.</p>',
                fn ($message) => $message->to($invitation->email)->subject('Your KiteLedger invitation to '.$tenant->company_name),
            );
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
