<?php

namespace App\Http\Controllers\Central;

use App\Data\TenantOnboardingData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Central\StoreTenantOnboardingRequest;
use App\Jobs\SaaS\BackupTenantJob;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\ImpersonationToken;
use App\Models\Central\PaymentGateway;
use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
use App\Services\SaaS\DatabaseProvisioning\ManualDatabaseProvisioner;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseNameValidator;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\TenantDatabaseService;
use App\Services\SaaS\TenantDeletionService;
use App\Services\SaaS\TenantProvisioningService;
use App\Services\SaaS\TenantSuspensionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Support\PhoneNumber;
use Inertia\Inertia;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $tenants = Tenant::with(['plan', 'domains'])
            ->when($request->search, fn ($q, $v) => $q->where(fn ($q) => $q->where('company_name', 'like', "%{$v}%")->orWhere('owner_email', 'like', "%{$v}%")))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->plan_id, fn ($q, $v) => $q->where('plan_id', $v))
            ->latest()->paginate(20)->withQueryString();

        return Inertia::render('Central/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => $request->only('search', 'status', 'plan_id'),
            'plans' => Plan::orderBy('sort_order')->get(['id', 'name']),
            'summary' => [
                'total' => Tenant::count(),
                'active' => Tenant::where('status', 'active')->count(),
                'trialing' => Tenant::where('status', 'trialing')->count(),
                'attention' => Tenant::whereIn('status', ['suspended', 'expired', 'provisioning_failed', 'deletion_pending'])->count(),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('Central/Tenants/Form', $this->options());
    }

    public function store(StoreTenantOnboardingRequest $request, TenantProvisioningService $service, CentralAuditService $audit)
    {
        $validated = $request->validated(); unset($validated['phone_country_code']);
        $data = TenantOnboardingData::from($validated)->toArray();
        try {
            $tenant = $service->create($data + ['created_by' => $request->attributes->get('centralAdmin')?->id]);
        } catch (\Throwable $exception) {
            report($exception);
            throw ValidationException::withMessages([
                'provisioning' => 'Tenant provisioning failed: '.Str::limit($exception->getMessage(), 240).'. Review the database credentials and provisioning logs, then retry.',
            ]);
        }
        $audit->log($request, 'tenant.created', $tenant, [], $tenant->only(['company_name', 'owner_email', 'status', 'plan_id']));

        $message = $tenant->status === 'active'
            ? 'Tenant created and provisioned successfully.'
            : 'Tenant created and queued for provisioning. Ensure the provisioning queue cron job is configured.';

        return redirect()->route('central.tenants.show', $tenant)->with('success', $message);
    }

    public function testDatabase(Request $request, ManualDatabaseProvisioner $manual, TenantDatabaseNameValidator $names)
    {
        $data = $request->validate([
            'tenancy_db_host' => ['required', 'string', 'max:255'], 'tenancy_db_port' => ['required', 'integer', 'between:1,65535'],
            'tenancy_db_name' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'tenancy_db_username' => ['required', 'string', 'max:255'], 'tenancy_db_password' => ['nullable', 'string', 'max:1024'],
        ]);
        try {
            $names->assertValid($data['tenancy_db_name']);
            $manual->verify(['host' => $data['tenancy_db_host'], 'port' => $data['tenancy_db_port'], 'database' => $data['tenancy_db_name'], 'username' => $data['tenancy_db_username'], 'password' => (string) ($data['tenancy_db_password'] ?? '')]);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['tenancy_db_name' => 'The database could not be verified. Check its name, credentials, connectivity, and privileges.']);
        }

        return response()->json(['message' => 'Database connection and required privileges were verified.']);
    }

    public function show(Tenant $tenant)
    {
        return Inertia::render('Central/Tenants/Show', ['tenant' => $tenant->load(['plan', 'domains', 'subscription.plan', 'provisioningLogs', 'usageMetrics', 'invoices', 'backupManifests' => fn ($query) => $query->where('status', 'verified')->latest()->limit(20), 'deletionRequests' => fn ($query) => $query->latest()->limit(5)]), 'options' => $this->options()]);
    }

    public function edit(Tenant $tenant)
    {
        return Inertia::render('Central/Tenants/Form', $this->options() + ['tenant' => $tenant]);
    }

    public function update(Request $request, Tenant $tenant, CentralAuditService $audit)
    {
        $old = $tenant->getOriginal();
        $data = $request->validate(['company_name' => ['required', 'string', 'max:255'], 'legal_name' => ['nullable', 'string', 'max:255'], 'owner_name' => ['required', 'string', 'max:255'], 'owner_phone' => ['nullable', 'string', 'max:50'], 'phone_country_code' => ['nullable','regex:/^\+[1-9][0-9]{0,3}$/'], 'country' => ['nullable', 'string', 'size:2'], 'address' => ['nullable', 'string'], 'timezone' => ['required', 'timezone'], 'currency' => ['required', 'string', 'size:3'], 'plan_id' => ['nullable', 'exists:plans,id'], 'default_template_id' => ['nullable', 'exists:default_data_templates,id'], 'tenancy_db_host' => ['required', 'string', 'max:255'], 'tenancy_db_port' => ['required', 'integer', 'between:1,65535'], 'tenancy_db_name' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('tenants', 'tenancy_db_name')->ignore($tenant)], 'tenancy_db_username' => ['required', 'string', 'max:255'], 'tenancy_db_password' => ['nullable', 'string', 'max:1024']]);
        $data['owner_phone'] = PhoneNumber::join($data['phone_country_code'] ?? PhoneNumber::callingCode($data['country'] ?? null), $data['owner_phone'] ?? null); unset($data['phone_country_code']);
        if (blank($data['tenancy_db_password'] ?? null)) {
            unset($data['tenancy_db_password']);
        }
        $tenant->update($data + ['database_name' => $data['tenancy_db_name'], 'database_provisioning_mode' => 'manual']);
        $this->syncTenantDatabaseInternals($tenant);
        $audit->log($request, 'tenant.updated', $tenant, $old, $tenant->getChanges());

        return redirect()->route('central.tenants.show', $tenant);
    }

    public function suspend(Request $request, Tenant $tenant, TenantSuspensionService $service, CentralAuditService $audit)
    {
        $old = $tenant->only(['status', 'status_reason']);
        $service->suspend($tenant, $request->validate(['reason' => ['required', 'string', 'max:1000']])['reason']);
        $audit->log($request, 'tenant.suspended', $tenant, $old, $tenant->only(['status', 'status_reason']));

        return back();
    }

    public function reactivate(Request $request, Tenant $tenant, TenantSuspensionService $service, CentralAuditService $audit)
    {
        $old = $tenant->only(['status', 'status_reason']);
        $service->reactivate($tenant);
        $audit->log($request, 'tenant.reactivated', $tenant, $old, $tenant->only(['status', 'status_reason']));

        return back();
    }

    public function retry(Request $request, Tenant $tenant, TenantProvisioningService $service)
    {
        abort_unless(in_array($tenant->status, ['pending', 'failed', 'provisioning_failed'], true), 422);
        $data = $request->validate([
            'owner_password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);
        $tenant = $service->retry($tenant, $data['owner_password']);

        return back()->with('success', $tenant->status === 'active'
            ? 'Tenant provisioning completed.'
            : 'Tenant provisioning was queued. Ensure the provisioning queue cron job is configured.');
    }

    public function migrate(Request $request, Tenant $tenant, TenantDatabaseService $databases, CentralAuditService $audit)
    {
        $databases->migrate($tenant);
        $audit->log($request, 'tenant.migrations.ran', $tenant, [], ['tenant_id' => $tenant->id]);

        return back()->with('success', 'Tenant migrations completed.');
    }

    public function seed(Request $request, Tenant $tenant, TenantDatabaseService $databases, CentralAuditService $audit)
    {
        $databases->seed($tenant);
        $audit->log($request, 'tenant.seeders.ran', $tenant, [], ['tenant_id' => $tenant->id]);

        return back()->with('success', 'Tenant seeders completed.');
    }

    public function health(Tenant $tenant)
    {
        $domain = $tenant->domains()->where('is_primary', true)->first();
        $diagnostic = [
            'central_domains' => config('tenancy.central_domains'),
            'tenant_base_domain' => config('saas.tenant_base_domain'),
            'expected_wildcard' => '*.'.ltrim((string) config('saas.tenant_base_domain'), '.'),
            'domain' => [
                'hostname' => $domain?->domain,
                'exists' => $domain !== null,
                'status' => $domain?->status,
                'verification_status' => $domain?->verification_status,
                'verified' => $domain?->verification_status === 'verified' && $domain?->verified_at !== null,
            ],
            'tenant_active' => $tenant->status === 'active',
        ];
        try {
            $result = $tenant->run(fn (): array => [
                'database' => DB::connection()->getDatabaseName(),
                'database_reachable' => (bool) DB::connection()->getPdo(),
                'migration_count' => DB::table('migrations')->count(),
            ]);

            return response()->json(['healthy' => true] + $diagnostic + $result);
        } catch (\Throwable) {
            return response()->json(['healthy' => false] + $diagnostic + ['database_reachable' => false, 'message' => 'Tenant database health check failed.'], 503);
        } finally {
            if (tenancy()->initialized) {
                tenancy()->end();
            }
        }
    }

    public function backup(Request $request, Tenant $tenant, CentralAuditService $audit)
    {
        dispatch((new BackupTenantJob($tenant->id))->onConnection('central')->onQueue('backups'));
        $audit->log($request, 'tenant.backup_queued', $tenant, [], ['tenant_id' => $tenant->id]);

        return back()->with('success', 'Tenant backup queued.');
    }

    public function destroy(Request $request, Tenant $tenant, TenantDeletionService $deletions, CentralAuditService $audit)
    {
        abort_if($tenant->is_internal, 422, 'Internal tenants cannot be deleted.');
        $snapshot = $tenant->only(['id', 'company_name', 'owner_email', 'status', 'database_provisioning_mode']);
        $deletions->deleteImmediately($tenant);
        $audit->log($request, 'tenant.deleted', $tenant, $snapshot, ['deleted_at' => $tenant->deleted_at?->toIso8601String()]);

        return redirect()->route('central.tenants.index')->with('success', 'Tenant deleted successfully.');
    }

    public function impersonate(Request $request, Tenant $tenant, CentralAuditService $audit)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:10', 'max:1000'], 'current_password' => ['required', 'string']]);
        $admin = $request->attributes->get('centralAdmin');
        abort_unless(Hash::check($data['current_password'], $admin->password), 422, 'The password is incorrect.');
        $domain = $tenant->domains()->where('status', 'active')->whereNotNull('verified_at')->where('is_primary', true)->firstOrFail();
        $plain = Str::random(64);
        $token = ImpersonationToken::create(['id' => (string) Str::uuid(), 'admin_id' => $admin->id, 'tenant_id' => $tenant->id, 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addMinutes(10)]);
        $audit->log($request, 'tenant.impersonation_started', $tenant, [], ['token_id' => $token->id, 'reason' => $data['reason']]);

        return redirect()->away('https://'.$domain->domain.'/impersonate/'.$plain);
    }

    private function validated(Request $request): array
    {
        $mode = config('saas.database.mode', config('saas.db_provisioning_mode', 'manual'));
        $manual = $mode === 'manual';
        $mysql = in_array($mode, ['mysql'], true);

        return $request->validate(['company_name' => ['required', 'string', 'max:255'], 'legal_name' => ['nullable', 'string', 'max:255'], 'owner_name' => ['required', 'string', 'max:255'], 'owner_email' => ['required', 'email', 'max:255'], 'owner_phone' => ['nullable', 'string', 'max:50'], 'country' => ['nullable', 'string', 'size:2'], 'address' => ['nullable', 'string'], 'timezone' => ['required', 'timezone'], 'currency' => ['required', 'string', 'size:3'], 'plan_id' => ['nullable', 'exists:plans,id'], 'default_template_id' => ['nullable', 'exists:default_data_templates,id'], 'subdomain' => ['required', 'string', 'max:63', Rule::notIn(config('saas.reserved_subdomains'))], 'owner_password' => ['required', 'string', 'min:12', 'confirmed'], 'tenancy_db_host' => [$manual ? 'required' : 'nullable', 'string', 'max:255'], 'tenancy_db_port' => [$manual ? 'required' : 'nullable', 'integer', 'between:1,65535'], 'tenancy_db_name' => [$manual || $mysql ? 'required' : 'nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('tenants', 'tenancy_db_name')], 'tenancy_db_username' => [$manual ? 'required' : 'nullable', 'string', 'max:255'], 'tenancy_db_password' => ['nullable', 'string', 'max:1024']]);
    }

    private function syncTenantDatabaseInternals(Tenant $tenant): void
    {
        $tenant->setInternal('db_connection', 'tenant_template');
        $tenant->setInternal('db_name', $tenant->tenancy_db_name);
        $tenant->setInternal('db_host', $tenant->tenancy_db_host);
        $tenant->setInternal('db_port', $tenant->tenancy_db_port);
        $tenant->setInternal('db_username', $tenant->tenancy_db_username);
        $tenant->setInternal('db_password', $tenant->tenancy_db_password);
        $tenant->save();
    }

    private function options(): array
    {
        $manager = app(DatabaseProvisionerManager::class);
        $modes = collect(config('saas.database.allowed_modes', [config('saas.database.mode', 'manual')]))
            ->unique()->filter(function (string $mode) use ($manager): bool {
                try {
                    return $manager->driver($mode)->available();
                } catch (\Throwable) {
                    return false;
                }
            })->values();

        return [
            'plans' => Plan::where('is_active', true)->orderBy('sort_order')->get(),
            'templates' => DefaultDataTemplate::where('is_active', true)->orderBy('name')->get(),
            'billingCycles' => ['monthly', 'yearly'], 'subscriptionModes' => ['trial', 'active'],
            'provisioningModes' => $modes, 'tenantBaseDomain' => config('saas.tenant_base_domain'),
            'databasePool' => $modes->contains('pool') ? TenantDatabasePool::where('status', 'available')->whereNotNull('validated_at')->orderBy('database_name')->get(['id', 'database_name', 'status', 'validated_at']) : [],
            'payment' => $this->paymentOptions(),
            'defaults' => ['timezone' => config('app.timezone', 'UTC'), 'currency' => app(PlatformSettingsService::class)->get('billing.default_currency', 'USD'), 'country' => app(PlatformSettingsService::class)->get('tenant_registration.default_country', 'US'), 'calling_codes' => PhoneNumber::CALLING_CODES],
            'provisioningQueueEnabled' => (bool) app(PlatformSettingsService::class)->get('provisioning.queue_tenant_provisioning', false),
            'provisioningQueueCommand' => 'php artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300',
        ];
    }

    private function paymentOptions(): array
    {
        $manual = PaymentGateway::where('slug', 'manual')->where('is_active', true)->first();
        $safeMethods = ['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'];

        return ['enabled' => (bool) $manual, 'methods' => collect($manual?->config['methods'] ?? $safeMethods)->intersect($safeMethods)->values(), 'proof_required' => (bool) ($manual?->config['proof_required'] ?? false)];
    }
}
