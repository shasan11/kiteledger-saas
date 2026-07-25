<?php

namespace App\Services\SaaS;

use App\Enums\TenantStatus;
use App\Models\Branch;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Tenant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantProvisioningRunner
{
    public function __construct(
        private DefaultTemplateService $templates,
        private SubscriptionService $subscriptions,
        private TenantDatabaseService $databases,
        private TenantLifecycleService $lifecycle,
        private TenantDomainService $domains,
        private CentralNotificationService $notifications,
    ) {}

    public function run(Tenant $tenant, bool $retry = false): Tenant
    {
        return Cache::lock('tenant-provision:'.$tenant->getTenantKey(), (int) config('saas.provisioning_lock_ttl', 1800))
            ->block(5, fn (): Tenant => $this->runUnlocked($tenant, $retry));
    }

    private function runUnlocked(Tenant $tenant, bool $retry): Tenant
    {
        $tenant = Tenant::query()->findOrFail($tenant->getTenantKey());
        if ($tenant->status === TenantStatus::Active->value && ! $retry) {
            return $tenant;
        }

        $attemptId = (string) Str::uuid();
        $this->recordAttempt($attemptId, $tenant, 'running', [
            'idempotency_key' => 'provision:'.$attemptId,
            'started_at' => now(),
        ]);

        if ($tenant->status !== TenantStatus::Provisioning->value) {
            $tenant = $this->lifecycle->transition(
                $tenant,
                TenantStatus::Provisioning,
                idempotencyKey: 'provision-start:'.$attemptId,
            );
        }

        try {
            $this->step($tenant, $attemptId, 'domain', fn () => $this->repairDomain($tenant), repeat: true);
            $this->step($tenant, $attemptId, 'database', function () use ($tenant): void {
                $this->databases->create($tenant);
            });
            $this->databases->syncConnectionValues($tenant->refresh());
            $this->step($tenant, $attemptId, 'migrations', fn () => $this->databases->migrate($tenant));
            $this->step($tenant, $attemptId, 'seeders', fn () => $this->databases->seed($tenant));
            $this->step($tenant, $attemptId, 'template', fn () => $this->templates->apply(
                $tenant,
                $tenant->default_template_id ? DefaultDataTemplate::find($tenant->default_template_id) : null,
            ));
            $this->step($tenant, $attemptId, 'owner', fn () => $this->createOwner($tenant));
            $this->step($tenant, $attemptId, 'subscription', function () use ($tenant): void {
                $tenant->refresh();
                if ($tenant->plan && ! $tenant->subscription) {
                    $this->subscriptions->start($tenant, $tenant->plan, idempotencyKey: 'tenant-provisioning:'.$tenant->id);
                }
            });

            $tenant->refresh();
            $data = $tenant->data ?? [];
            unset($data['provisioning_owner_password']);
            $tenant->forceFill([
                'data' => $data,
                'provisioning_step' => null,
                'last_provisioning_error' => null,
                'provisioned_at' => now(),
            ])->save();
            $tenant = $this->lifecycle->transition($tenant, TenantStatus::Active, idempotencyKey: 'provision-complete:'.$attemptId);
            $this->recordAttempt($attemptId, $tenant, 'succeeded', ['finished_at' => now(), 'current_step' => null]);
            $this->notifySafely('provisioning_completed', 'success', 'Tenant provisioning completed', $tenant->company_name.' is ready.', $tenant, $attemptId);

            return $tenant->refresh();
        } catch (\Throwable $exception) {
            $code = $this->safeErrorCode($exception);
            $failedStep = $tenant->fresh()->provisioning_step;
            $current = $tenant->fresh();
            if ($current->status === TenantStatus::Provisioning->value) {
                $tenant = $this->lifecycle->transition($current, TenantStatus::ProvisioningFailed, $code, 'provision-failed:'.$attemptId);
            }
            $tenant->forceFill([
                'provisioning_step' => $failedStep,
                'last_provisioning_error' => 'Tenant provisioning could not complete. Review the failed step and retry.',
            ])->save();
            $this->recordAttempt($attemptId, $tenant, 'failed', [
                'current_step' => $failedStep,
                'error_code' => $code,
                'safe_message' => 'Tenant provisioning could not complete. Review the failed step and retry.',
                'finished_at' => now(),
            ]);
            $this->notifySafely('provisioning_failed', 'critical', 'Tenant provisioning failed', $tenant->company_name.' could not be provisioned. Error code: '.$code, $tenant, $attemptId, $code);
            report($exception);

            throw $exception;
        }
    }

    private function step(Tenant $tenant, string $attemptId, string $step, callable $callback, bool $repeat = false): void
    {
        if (! $repeat && ProvisioningLog::query()->where('tenant_id', $tenant->id)->where('step', $step)->where('status', 'success')->exists()) {
            return;
        }

        $tenant->forceFill(['provisioning_step' => $step, 'last_provisioning_error' => null])->save();
        $this->recordAttempt($attemptId, $tenant, 'running', ['current_step' => $step]);
        $log = ProvisioningLog::query()->create([
            'tenant_id' => $tenant->id,
            'step' => $step,
            'status' => 'running',
            'started_at' => now(),
            'context' => ['attempt_id' => $attemptId],
        ]);

        try {
            $callback();
            $log->update(['status' => 'success', 'finished_at' => now()]);
        } catch (\Throwable $exception) {
            $log->update(['status' => 'failed', 'message' => $this->safeErrorCode($exception), 'finished_at' => now()]);
            throw $exception;
        }
    }

    private function createOwner(Tenant $tenant): void
    {
        try {
            $tenant->run(function () use ($tenant): void {
                $branch = Branch::query()->where('is_head_office', true)->first()
                    ?? Branch::query()->firstOrCreate(['code' => 'MAIN'], ['name' => 'Main Branch', 'active' => true, 'is_head_office' => true]);
                $encrypted = ($tenant->data ?? [])['provisioning_owner_password'] ?? null;
                if (! $encrypted) {
                    throw new \RuntimeException('owner_creation_failed');
                }
                $user = User::query()->firstOrCreate(['email' => $tenant->owner_email], [
                    'name' => $tenant->owner_name,
                    'first_name' => Str::before($tenant->owner_name, ' '),
                    'last_name' => Str::after($tenant->owner_name, ' '),
                    'username' => Str::slug(Str::before($tenant->owner_email, '@')).'-'.Str::lower(Str::random(4)),
                    'branch_id' => $branch->id,
                    'password' => Hash::make(Crypt::decryptString($encrypted)),
                    'email_verified_at' => now(),
                    'active' => true,
                    'is_system_generated' => true,
                ]);
                $role = Role::query()->whereIn('name', ['Company Owner', 'Super Admin', 'Full Access User'])->first();
                if ($role) {
                    $user->forceFill(['role_id' => $role->id])->save();
                    $user->syncRoles([$role]);
                }
                $branch->forceFill(['name' => $tenant->company_name.' Main Branch', 'email' => $tenant->owner_email, 'user_add_id' => $user->id])->save();
            });
        } catch (\Throwable $exception) {
            if ($exception->getMessage() === 'owner_creation_failed') {
                throw $exception;
            }
            throw new \RuntimeException('owner_creation_failed', previous: $exception);
        }
    }

    private function repairDomain(Tenant $tenant): void
    {
        $slug = $tenant->slug;
        if (blank($slug)) {
            $existingHost = (string) $tenant->domains()->where('type', 'subdomain')->value('domain');
            $slug = Str::before($existingHost, '.');
        }
        if (blank($slug)) {
            throw new \RuntimeException('tenant_domain_invalid');
        }

        $slug = $this->domains->normalizeSubdomain((string) $slug);
        if ($tenant->slug !== $slug) {
            $tenant->forceFill(['slug' => $slug])->save();
        }
        $this->domains->attachSubdomain($tenant, $slug);
    }

    private function recordAttempt(string $attemptId, Tenant $tenant, string $status, array $values): void
    {
        DB::connection(config('tenancy.database.central_connection'))->table('tenant_provisioning_attempts')->updateOrInsert(
            ['id' => $attemptId],
            array_merge(['tenant_id' => $tenant->id, 'status' => $status, 'updated_at' => now()], $values, ['created_at' => now()]),
        );
    }

    private function notifySafely(string $type, string $severity, string $title, string $message, Tenant $tenant, string $attemptId, ?string $errorCode = null): void
    {
        try {
            $this->notifications->notifyOnce($type, 'provisioning', $severity, $title, $message, route('central.tenants.show', $tenant), $tenant, array_filter(['attempt_id' => $attemptId, 'error_code' => $errorCode]), 1);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function safeErrorCode(\Throwable $exception): string
    {
        $message = strtolower($exception->getMessage());
        foreach ([
            'pool_exhausted', 'pool_database_invalid', 'central_database_rejected', 'database_connection_failed',
            'database_name_invalid', 'database_name_collision', 'database_already_owned', 'ownership_marker_missing',
            'ownership_marker_mismatch', 'manual_database_not_found', 'manual_database_access_denied',
            'manual_database_privilege_check_failed', 'manual_database_connection_failed', 'manual_database_verification_failed',
            'automatic_privilege_unavailable', 'cpanel_not_configured', 'cpanel_authentication_failed',
            'cpanel_database_create_failed', 'cpanel_privilege_assignment_failed', 'cpanel_connection_failed',
            'tenant_migration_failed', 'tenant_seeding_failed', 'owner_creation_failed',
            'tenant_database_provisioner_unavailable', 'tenant_domain_creation_failed', 'tenant_domain_invalid',
            'tenant_base_domain_missing', 'tenant_domain_verification_failed',
        ] as $code) {
            if (str_contains($message, $code)) {
                return $code;
            }
        }

        return 'provisioning_step_failed';
    }
}
