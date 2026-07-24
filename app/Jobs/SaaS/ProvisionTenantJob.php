<?php

namespace App\Jobs\SaaS;

use App\Enums\TenantStatus;
use App\Models\Branch;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Tenant;
use App\Models\Role;
use App\Models\User;
use App\Services\SaaS\CentralNotificationService;
use App\Services\SaaS\DefaultTemplateService;
use App\Services\SaaS\SubscriptionService;
use App\Services\SaaS\TenantDatabaseService;
use App\Services\SaaS\TenantLifecycleService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProvisionTenantJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 280;

    public int $uniqueFor = 1800;

    public string $attemptId;

    public function __construct(public string $tenantId, public bool $retry = false)
    {
        $this->attemptId = (string) Str::uuid();
        $this->onConnection('central');
        $this->onQueue((string) config('saas.provisioning_queue', 'provisioning'));
    }

    public function uniqueId(): string
    {
        return $this->tenantId;
    }

    public function handle(DefaultTemplateService $templates, SubscriptionService $subscriptions, TenantDatabaseService $databases, TenantLifecycleService $lifecycle): void
    {
        $tenant = DB::connection(config('tenancy.database.central_connection'))->transaction(function (): Tenant {
            return Tenant::query()->lockForUpdate()->findOrFail($this->tenantId);
        });
        DB::connection(config('tenancy.database.central_connection'))->table('tenant_provisioning_attempts')->updateOrInsert(
            ['id' => $this->attemptId],
            ['tenant_id' => $tenant->id, 'status' => 'running', 'idempotency_key' => 'provision:'.$this->attemptId, 'started_at' => now(), 'updated_at' => now(), 'created_at' => now()],
        );
        if ($tenant->status !== TenantStatus::Provisioning->value) {
            $tenant = $lifecycle->transition($tenant, TenantStatus::Provisioning, idempotencyKey: 'provision-start:'.$this->attemptId.':'.$this->attempts());
        }
        try {
            $this->step($tenant, 'database', function () use ($tenant, $databases): void {
                if (! $this->retry || ! $databases->exists($tenant)) {
                    $databases->create($tenant);
                }
            });
            $this->step($tenant, 'migrations', fn () => $databases->migrate($tenant));
            $this->step($tenant, 'seeders', fn () => $databases->seed($tenant));
            $this->step($tenant, 'template', fn () => $templates->apply($tenant, $tenant->default_template_id ? DefaultDataTemplate::find($tenant->default_template_id) : null));
            $this->step($tenant, 'owner', fn () => $this->createOwner($tenant));
            $this->step($tenant, 'subscription', function () use ($tenant, $subscriptions): void {
                if ($tenant->plan && ! $tenant->subscription) {
                    $subscriptions->start($tenant, $tenant->plan);
                }
            });
            $tenant->refresh();
            $data = $tenant->data ?? [];
            unset($data['provisioning_owner_password']);
            $tenant->data = $data;
            $lifecycle->transition($tenant, TenantStatus::Active, idempotencyKey: 'provision-complete:'.$this->attemptId);
            DB::connection(config('tenancy.database.central_connection'))->table('tenant_provisioning_attempts')->where('id', $this->attemptId)->update(['status' => 'succeeded', 'finished_at' => now(), 'updated_at' => now()]);
            app(CentralNotificationService::class)->notifyOnce('provisioning_completed', 'provisioning', 'success', 'Tenant provisioning completed', $tenant->company_name.' is ready.', route('central.tenants.show', $tenant), $tenant, ['attempt_id' => $this->attemptId], 1);
        } catch (\Throwable $e) {
            $code = $this->safeErrorCode($e);
            if ($tenant->fresh()->status === TenantStatus::Provisioning->value) {
                $lifecycle->transition($tenant->fresh(), TenantStatus::ProvisioningFailed, $code, 'provision-failed:'.$this->attemptId.':'.$this->attempts());
            }
            DB::connection(config('tenancy.database.central_connection'))->table('tenant_provisioning_attempts')->where('id', $this->attemptId)->update(['status' => 'failed', 'error_code' => $code, 'safe_message' => 'Tenant provisioning could not complete. Review the failed step and retry.', 'finished_at' => now(), 'updated_at' => now()]);
            app(CentralNotificationService::class)->notifyOnce('provisioning_failed', 'provisioning', 'critical', 'Tenant provisioning failed', $tenant->company_name.' could not be provisioned. Error code: '.$code, route('central.tenants.show', $tenant), $tenant, ['attempt_id' => $this->attemptId, 'error_code' => $code], 1);
            report($e);
            throw $e;
        }
    }

    private function step(Tenant $tenant, string $step, callable $callback): void
    {
        if (ProvisioningLog::where('tenant_id', $tenant->id)->where('step', $step)->where('status', 'success')->exists()) {
            return;
        }
        DB::connection(config('tenancy.database.central_connection'))->table('tenant_provisioning_attempts')->where('id', $this->attemptId)->update(['current_step' => $step, 'updated_at' => now()]);
        $log = ProvisioningLog::create(['tenant_id' => $tenant->id, 'step' => $step, 'status' => 'running', 'started_at' => now(), 'context' => ['attempt_id' => $this->attemptId]]);
        try {
            $callback();
            $log->update(['status' => 'success', 'finished_at' => now()]);
        } catch (\Throwable $e) {
            $log->update(['status' => 'failed', 'message' => $this->safeErrorCode($e), 'finished_at' => now()]);
            throw $e;
        }
    }

    private function createOwner(Tenant $tenant): void
    {
        $tenant->run(function () use ($tenant): void {
            $branch = Branch::query()->where('is_head_office', true)->first() ?? Branch::query()->firstOrCreate(['code' => 'MAIN'], ['name' => 'Main Branch', 'active' => true, 'is_head_office' => true]);
            $encrypted = ($tenant->data ?? [])['provisioning_owner_password'] ?? null;
            if (! $encrypted) {
                throw new \RuntimeException('The encrypted owner password is missing.');
            }
            $user = User::query()->updateOrCreate(['email' => $tenant->owner_email], [
                'name' => $tenant->owner_name, 'first_name' => Str::before($tenant->owner_name, ' '), 'last_name' => Str::after($tenant->owner_name, ' '),
                'username' => Str::slug(Str::before($tenant->owner_email, '@')).'-'.Str::lower(Str::random(4)), 'branch_id' => $branch->id,
                'password' => Hash::make(Crypt::decryptString($encrypted)), 'email_verified_at' => now(), 'active' => true, 'is_system_generated' => true,
            ]);
            $role = Role::query()->whereIn('name', ['Company Owner', 'Super Admin', 'Full Access User'])->first();
            if ($role) {
                $user->forceFill(['role_id' => $role->id])->save();
                $user->syncRoles([$role]);
            }
            $branch->forceFill(['name' => $tenant->company_name.' Main Branch', 'email' => $tenant->owner_email, 'user_add_id' => $user->id])->save();
        });
    }

    public function failed(?\Throwable $exception): void
    {
        $tenant = Tenant::query()->find($this->tenantId);
        if (! $tenant) {
            return;
        }
        $data = $tenant->data ?? [];
        unset($data['provisioning_owner_password']);
        $tenant->forceFill(['data' => $data])->save();
    }

    private function safeErrorCode(\Throwable $e): string
    {
        $message = strtolower($e->getMessage());
        foreach ([
            'pool_exhausted',
            'pool_database_invalid',
            'central_database_rejected',
            'database_connection_failed',
            'database_name_invalid',
            'database_name_collision',
            'database_already_owned',
            'ownership_marker_missing',
            'ownership_marker_mismatch',
            'manual_database_not_found',
            'manual_database_access_denied',
            'manual_database_privilege_check_failed',
            'manual_database_connection_failed',
            'manual_database_verification_failed',
            'automatic_privilege_unavailable',
            'cpanel_not_configured',
            'cpanel_authentication_failed',
            'cpanel_database_create_failed',
            'cpanel_privilege_assignment_failed',
            'cpanel_connection_failed',
            'tenant_migration_failed',
            'tenant_seeding_failed',
            'owner_creation_failed',
            'queue_configuration_invalid',
            'tenant_database_provisioner_unavailable',
        ] as $code) {
            if (str_contains($message, $code)) {
                return $code;
            }
        }

        return 'provisioning_step_failed';
    }
}
