<?php

namespace App\Services\Tenancy;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Tenant;
use App\Models\Role;
use App\Models\User;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseProvisionerFactory;
use App\Services\SaaS\TenantDatabaseService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantProvisioningService
{
    public function __construct(
        private TenantDatabaseProvisionerFactory $provisioners,
        private TenantDatabaseService $databases,
        private TenantDatabaseName $databaseNames,
    ) {}

    public function provision(array $input): Tenant
    {
        $data = Validator::make($input, [
            'company_name' => ['required', 'string', 'max:255'],
            'slug' => ['required_without:subdomain', 'nullable', 'string', 'max:63'],
            'subdomain' => ['required_without:slug', 'nullable', 'string', 'max:63'],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_password' => ['required', 'string', 'min:12'],
            'plan_id' => ['nullable', Rule::exists('plans', 'id')],
            'provisioning_mode' => ['nullable', Rule::in(['manual', 'mysql', 'cpanel'])],
            'db_host' => ['nullable', 'string', 'max:255'],
            'db_port' => ['nullable', 'integer', 'between:1,65535'],
            'db_database' => ['nullable', 'string', 'max:64'],
            'db_username' => ['nullable', 'string', 'max:255'],
            'db_password' => ['nullable', 'string'],
        ])->validate();

        $slug = Str::slug((string) ($data['slug'] ?? $data['subdomain']));
        abort_if($slug === '' || in_array($slug, config('saas.reserved_subdomains', []), true), 422, 'The tenant slug is unavailable.');
        $mode = $data['provisioning_mode'] ?? config('saas.db_provisioning_mode', 'manual');
        if ($mode === 'manual') {
            Validator::make($data, [
                'db_host' => ['required'], 'db_database' => ['required'],
                'db_username' => ['required'], 'db_password' => ['present'],
            ])->validate();
        }

        return Cache::lock('tenant-provision:'.$slug, (int) config('saas.provisioning_lock_ttl', 1800))
            ->block(5, fn (): Tenant => $this->run($data, $slug, $mode));
    }

    public function retry(Tenant|string $tenant, string $ownerPassword): Tenant
    {
        $tenant = is_string($tenant) ? Tenant::query()->findOrFail($tenant) : $tenant;

        return $this->provision([
            'company_name' => $tenant->company_name, 'slug' => $tenant->slug,
            'owner_name' => $tenant->owner_name, 'owner_email' => $tenant->owner_email,
            'owner_password' => $ownerPassword, 'plan_id' => $tenant->plan_id,
            'provisioning_mode' => $tenant->database_provisioning_mode,
            'db_host' => $tenant->tenancy_db_host, 'db_port' => $tenant->tenancy_db_port,
            'db_database' => $tenant->tenancy_db_name, 'db_username' => $tenant->tenancy_db_username,
            'db_password' => $tenant->tenancy_db_password,
        ]);
    }

    private function run(array $data, string $slug, string $mode): Tenant
    {
        $tenant = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($data, $slug, $mode): Tenant {
            $tenant = Tenant::query()->firstOrNew(['slug' => $slug]);
            $database = $data['db_database'] ?? $tenant->tenancy_db_name;
            if (! $database && $mode !== 'manual') $database = $this->databaseNames->fromSlug($slug);
            $tenant->fill([
                'id' => $tenant->id ?: (string) Str::uuid(), 'company_name' => $data['company_name'],
                'slug' => $slug, 'owner_name' => $data['owner_name'], 'owner_email' => $data['owner_email'],
                'plan_id' => $data['plan_id'] ?? null, 'status' => 'provisioning',
                'provisioning_step' => 'database', 'last_provisioning_error' => null,
                'database_provisioning_mode' => $mode, 'tenancy_db_connection' => 'tenant_template',
                'tenancy_db_name' => $database, 'tenancy_db_host' => $data['db_host'] ?? config('database.connections.tenant_template.host'),
                'tenancy_db_port' => $data['db_port'] ?? config('database.connections.tenant_template.port'),
                'tenancy_db_username' => $data['db_username'] ?? config('database.connections.tenant_template.username'),
                'tenancy_db_password' => $data['db_password'] ?? config('database.connections.tenant_template.password'),
                'database_name' => $database,
                'data' => array_merge($tenant->data ?? [], ['provisioning_owner_password' => Crypt::encryptString($data['owner_password'])]),
            ])->save();

            return $tenant;
        });

        try {
            $this->step($tenant, 'database_creating', fn () => $this->provisioners->make($mode)->provision($tenant));
            $this->step($tenant, 'migrating', fn () => $this->databases->migrate($tenant));
            $this->step($tenant, 'seeding', fn () => $this->databases->seed($tenant));
            $this->step($tenant, 'owner', fn () => $this->createTenantRecords($tenant, $data['owner_password']));
            $tenant->domains()->updateOrCreate(['domain' => $slug.'.'.config('saas.tenant_base_domain')], [
                'type' => 'subdomain', 'status' => 'active', 'verification_status' => 'verified',
                'verified_at' => now(), 'is_primary' => true, 'ssl_status' => 'pending',
            ]);
            $payload = $tenant->data ?? [];
            unset($payload['provisioning_owner_password']);
            $tenant->forceFill(['status' => 'active', 'provisioning_step' => null, 'last_provisioning_error' => null, 'provisioned_at' => now(), 'data' => $payload])->save();

            return $tenant->refresh();
        } catch (\Throwable $exception) {
            $tenant->forceFill(['status' => 'failed', 'last_provisioning_error' => 'Tenant provisioning failed at '.$tenant->provisioning_step.'.'])->save();
            ProvisioningLog::create(['tenant_id' => $tenant->id, 'step' => $tenant->provisioning_step ?: 'unknown', 'status' => 'failed', 'message' => 'Provisioning step failed. Review server logs.', 'finished_at' => now()]);
            throw $exception;
        } finally {
            if (tenancy()->initialized) tenancy()->end();
        }
    }

    private function step(Tenant $tenant, string $step, callable $callback): void
    {
        $tenant->forceFill(['status' => $step === 'database_creating' ? 'database_creating' : $step, 'provisioning_step' => $step])->save();
        $log = ProvisioningLog::create(['tenant_id' => $tenant->id, 'step' => $step, 'status' => 'running', 'started_at' => now()]);
        $callback();
        $log->update(['status' => 'success', 'finished_at' => now()]);
        if ($step === 'database_creating') $tenant->forceFill(['status' => 'database_created'])->save();
    }

    private function createTenantRecords(Tenant $tenant, string $password): void
    {
        tenancy()->initialize($tenant);
        try {
            $branch = Branch::query()->where('is_head_office', true)->first() ?? Branch::query()->firstOrCreate(['code' => 'MAIN'], ['name' => 'Main Branch', 'active' => true, 'is_head_office' => true]);
            $user = User::query()->updateOrCreate(['email' => $tenant->owner_email], [
                'name' => $tenant->owner_name, 'first_name' => Str::before($tenant->owner_name, ' '),
                'last_name' => Str::after($tenant->owner_name, ' '), 'username' => Str::before($tenant->owner_email, '@'),
                'branch_id' => $branch->id, 'password' => Hash::make($password), 'email_verified_at' => now(),
                'active' => true, 'is_system_generated' => true,
            ]);
            $role = Role::query()->whereIn('name', ['Tenant Owner', 'Company Owner', 'Super Admin', 'Full Access User'])->first();
            if ($role) { $user->forceFill(['role_id' => $role->id])->save(); $user->syncRoles([$role]); }
            AppSetting::query()->updateOrCreate(['company_name' => $tenant->company_name], ['email' => $tenant->owner_email, 'timezone' => $tenant->timezone ?: 'UTC', 'active' => true, 'user_add_id' => $user->id]);
        } finally {
            tenancy()->end();
        }
    }
}
