<?php

namespace App\Services\SaaS;

use App\Enums\TenantStatus;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use App\Models\Central\TenantInitialPaymentIntent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantProvisioningService
{
    public function __construct(
        private TenantDomainService $domains,
        private TenantProvisioningRunner $runner,
    ) {}

    public function create(array $attributes): Tenant
    {
        if ($key = ($attributes['onboarding_idempotency_key'] ?? null)) {
            if ($existing = Tenant::where('onboarding_idempotency_key', $key)->first()) {
                if ($existing->status === TenantStatus::Active->value) {
                    return $existing;
                }

                return $this->retry($existing, $attributes['owner_password'] ?? null);
            }
        }

        $mode = (string) ($attributes['provisioning_mode'] ?? config('saas.database.mode', config('saas.db_provisioning_mode', 'manual')));
        $manual = $mode === 'manual';
        $mysql = $mode === 'mysql';

        Validator::make($attributes, [
            'provisioning_mode' => ['nullable', Rule::in(config('saas.database.allowed_modes', [config('saas.database.mode', 'manual')]))],
            'tenancy_db_host' => [$manual ? 'required' : 'nullable', 'string'],
            'tenancy_db_port' => [$manual ? 'required' : 'nullable', 'integer', 'between:1,65535'],
            'tenancy_db_name' => [$manual || $mysql ? 'required' : 'nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'tenancy_db_username' => [$manual ? 'required' : 'nullable', 'string'],
            'tenancy_db_password' => [$manual ? 'present' : 'nullable', 'string'],
        ])->validate();

        $payment = (array) ($attributes['initial_payment'] ?? []);
        unset($attributes['initial_payment']);
        $proofPath = null;
        if (($payment['enabled'] ?? false) && isset($payment['proof'])) {
            $proofPath = $payment['proof']->store('central/payment-proofs/'.now()->format('Y/m'), 'local');
            unset($payment['proof']);
        }

        $attributes += [
            'tenancy_db_host' => null,
            'tenancy_db_port' => null,
            'tenancy_db_name' => null,
            'tenancy_db_username' => null,
            'tenancy_db_password' => null,
        ];

        try {
            $tenant = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($attributes, $mode, $payment, $proofPath): Tenant {
                $password = $attributes['owner_password'];
                $subdomain = $this->domains->normalizeSubdomain($attributes['subdomain']);
                $billingCycle = $attributes['billing_cycle'] ?? 'monthly';
                $subscriptionMode = $attributes['subscription_start_mode'] ?? 'active';
                $effectiveAt = $attributes['effective_at'] ?? now();
                $onboardingKey = $attributes['onboarding_idempotency_key'] ?? (string) Str::uuid();
                $poolId = $attributes['database_pool_id'] ?? null;
                unset($attributes['owner_password'], $attributes['subdomain'], $attributes['provisioning_mode'], $attributes['billing_cycle'], $attributes['subscription_start_mode'], $attributes['effective_at'], $attributes['database_pool_id']);
                $id = (string) Str::uuid();
                $databaseName = filled($attributes['tenancy_db_name']) ? (string) $attributes['tenancy_db_name'] : null;

                $tenant = Tenant::query()->create(array_merge($attributes, [
                    'id' => $id,
                    'slug' => $subdomain,
                    'status' => 'pending',
                    'database_name' => $databaseName,
                    'database_provisioning_mode' => $mode,
                    'tenancy_db_connection' => 'tenant_template',
                    'database_created_by_app' => false,
                    // Stancl persists non-custom attributes in the virtual `data`
                    // column and exposes them as model attributes after retrieval.
                    'provisioning_owner_password' => $password,
                    'onboarding_idempotency_key' => $onboardingKey,
                    'onboarding_billing_cycle' => $billingCycle,
                    'onboarding_subscription_mode' => $subscriptionMode,
                    'onboarding_effective_at' => $effectiveAt,
                    'database_pool_id' => $poolId,
                ]));
                $this->domains->attachSubdomain($tenant, $subdomain);
                if ($mode === 'pool') {
                    $pool = TenantDatabasePool::query()->whereKey($poolId)->where('status', 'available')->whereNotNull('validated_at')->lockForUpdate()->firstOrFail();
                    $pool->update(['status' => 'reserved', 'tenant_id' => $tenant->id, 'allocated_at' => now(), 'released_at' => null]);
                }
                if (($payment['enabled'] ?? false) === true) {
                    TenantInitialPaymentIntent::create([
                        'tenant_id' => $tenant->id, 'amount' => $payment['amount'] ?? null,
                        'currency' => strtoupper((string) $payment['currency']), 'payment_method' => $payment['payment_method'],
                        'payment_date' => $payment['payment_date'], 'reference' => $payment['reference'] ?? null,
                        'bank_reference' => $payment['bank_reference'] ?? null, 'notes' => $payment['notes'] ?? null,
                        'proof_disk' => $proofPath ? 'local' : null, 'proof_path' => $proofPath,
                        'send_receipt' => (bool) ($payment['send_receipt'] ?? false),
                        'adjustment_acknowledged' => (bool) ($payment['adjustment_acknowledged'] ?? false),
                        'idempotency_key' => 'tenant:'.$tenant->id.':initial-payment',
                    ]);
                }

                return $tenant;
            });
        } catch (\Throwable $exception) {
            if ($proofPath) {
                Storage::disk('local')->delete($proofPath);
            }
            throw $exception;
        }

        try {
            $tenant = $this->runner->run($tenant);
        } catch (\Throwable $exception) {
            if ($tenant->database_provisioning_mode === 'pool') {
                DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($tenant): void {
                    $pool = TenantDatabasePool::where('tenant_id', $tenant->id)->lockForUpdate()->first();
                    if ($pool?->status === 'reserved' && blank($pool->ownership_tenant_id)) {
                        $pool->update(['status' => 'available', 'tenant_id' => null, 'allocated_at' => null, 'released_at' => now()]);
                    }
                });
            }
            throw $exception;
        }
        if ($tenant->status !== 'active') {
            throw new \RuntimeException('tenant_provisioning_incomplete');
        }

        return $tenant;
    }

    public function retry(Tenant $tenant, ?string $ownerPassword = null): Tenant
    {
        if ($ownerPassword !== null) {
            $tenant->forceFill([
                'provisioning_owner_password' => $ownerPassword,
            ])->save();
        }

        return $this->runner->run($tenant, true);
    }
}
