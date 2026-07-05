<?php

namespace App\Services\SaaS;

use App\Enums\TenantStatus;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TenantLifecycleService
{
    public function transition(Tenant $tenant, TenantStatus $to, ?string $reason = null, ?string $idempotencyKey = null): Tenant
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($tenant, $to, $reason, $idempotencyKey): Tenant {
            $locked = Tenant::query()->lockForUpdate()->findOrFail($tenant->getKey());
            $from = TenantStatus::from($locked->status);

            if ($from === $to) {
                return $locked;
            }
            if (! $from->canTransitionTo($to)) {
                throw ValidationException::withMessages(['status' => "Invalid tenant transition from {$from->value} to {$to->value}."]);
            }

            if ($idempotencyKey && DB::connection(config('tenancy.database.central_connection'))->table('saas_lifecycle_transitions')->where('idempotency_key', $idempotencyKey)->exists()) {
                return $locked;
            }

            $locked->forceFill([
                'status' => $to->value,
                'status_reason' => $reason,
                'lifecycle_version' => $locked->lifecycle_version + 1,
            ])->save();

            DB::connection(config('tenancy.database.central_connection'))->table('saas_lifecycle_transitions')->insert([
                'tenant_id' => $locked->id,
                'subject_type' => Tenant::class,
                'subject_id' => $locked->id,
                'from_state' => $from->value,
                'to_state' => $to->value,
                'reason_code' => $reason,
                'idempotency_key' => $idempotencyKey,
                'created_at' => now(),
            ]);

            return $locked->refresh();
        });
    }
}
