<?php

namespace App\Services\SaaS;

use App\Contracts\SaaS\QuotaManager;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AtomicQuotaManager implements QuotaManager
{
    private const LIMITS = [
        'users' => 'max_users', 'branches' => 'max_branches', 'products' => 'max_products',
        'customers' => 'max_customers', 'invoices' => 'max_invoices_per_month',
        'storage_mb' => 'max_storage_mb', 'ai_requests' => 'max_ai_requests_per_month',
        'api_requests' => 'max_api_requests_per_month', 'custom_domains' => 'max_custom_domains',
        'warehouses' => 'max_warehouses',
    ];

    private const TABLES = [
        'users' => 'users', 'branches' => 'branches', 'products' => 'products',
        'customers' => 'contacts', 'invoices' => 'invoices', 'warehouses' => 'warehouses',
    ];

    public function reserve(Tenant $tenant, string $metric, int $quantity = 1): ?string
    {
        $quantity = max(1, $quantity);
        $column = self::LIMITS[$metric] ?? null;
        $limit = $column ? $tenant->plan?->{$column} : null;
        if ($limit === null) {
            return null;
        }
        if ((int) $limit === 0) {
            throw ValidationException::withMessages([$metric => "The {$metric} quota is disabled for this plan."]);
        }

        [$start, $end] = $this->period($tenant, $metric);
        $initial = $this->initialUsage($tenant, $metric, $start, $end);
        $connection = DB::connection(config('tenancy.database.central_connection'));

        return $connection->transaction(function () use ($connection, $tenant, $metric, $quantity, $limit, $start, $end, $initial): string {
            $connection->table('tenant_usage_counters')->insertOrIgnore([
                'tenant_id' => $tenant->id, 'metric' => $metric, 'period_start' => $start,
                'period_end' => $end, 'used' => $initial, 'reserved' => 0, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $counter = $connection->table('tenant_usage_counters')
                ->where(['tenant_id' => $tenant->id, 'metric' => $metric, 'period_start' => $start])
                ->lockForUpdate()->first();
            if ($counter->used + $counter->reserved + $quantity > (int) $limit) {
                throw ValidationException::withMessages([$metric => "The {$metric} plan limit has been reached."]);
            }

            $id = (string) Str::uuid();
            $connection->table('tenant_quota_reservations')->insert([
                'id' => $id, 'tenant_id' => $tenant->id, 'metric' => $metric, 'quantity' => $quantity,
                'status' => 'reserved', 'expires_at' => now()->addMinutes(15), 'created_at' => now(), 'updated_at' => now(),
            ]);
            $connection->table('tenant_usage_counters')->where('id', $counter->id)->increment('reserved', $quantity, ['updated_at' => now()]);

            return $id;
        });
    }

    public function finalize(string $reservationId): void
    {
        $this->complete($reservationId, true);
    }

    public function release(string $reservationId): void
    {
        $this->complete($reservationId, false);
    }

    public function expireStale(int $limit = 500): int
    {
        $ids = DB::connection(config('tenancy.database.central_connection'))->table('tenant_quota_reservations')->where('status', 'reserved')->where('expires_at', '<', now())->orderBy('created_at')->limit($limit)->pluck('id');
        $ids->each(fn (string $id) => $this->release($id));

        return $ids->count();
    }

    private function complete(string $id, bool $used): void
    {
        $connection = DB::connection(config('tenancy.database.central_connection'));
        $connection->transaction(function () use ($connection, $id, $used): void {
            $reservation = $connection->table('tenant_quota_reservations')->lockForUpdate()->find($id);
            if (! $reservation || $reservation->status !== 'reserved') {
                return;
            }
            $counter = $connection->table('tenant_usage_counters')->where([
                'tenant_id' => $reservation->tenant_id, 'metric' => $reservation->metric,
            ])->orderByDesc('period_start')->lockForUpdate()->first();
            if ($counter) {
                $connection->table('tenant_usage_counters')->where('id', $counter->id)->update([
                    'reserved' => max(0, $counter->reserved - $reservation->quantity),
                    'used' => $counter->used + ($used ? $reservation->quantity : 0), 'updated_at' => now(),
                ]);
            }
            $connection->table('tenant_quota_reservations')->where('id', $id)->update(['status' => $used ? 'finalized' : 'released', 'updated_at' => now()]);
        });
    }

    private function period(Tenant $tenant, string $metric): array
    {
        if (in_array($metric, ['invoices', 'storage_mb', 'ai_requests', 'api_requests'], true)) {
            $subscription = $tenant->subscription;

            return [($subscription?->current_period_starts_at ?? now()->startOfMonth())->toDateString(), ($subscription?->current_period_ends_at ?? now()->endOfMonth())->toDateString()];
        }

        return ['1970-01-01', '9999-12-31'];
    }

    private function initialUsage(Tenant $tenant, string $metric, string $start, string $end): int
    {
        $table = self::TABLES[$metric] ?? null;
        if (! $table) {
            return 0;
        }

        return $tenant->run(function () use ($table, $metric, $start, $end): int {
            if (! Schema::hasTable($table)) {
                return 0;
            }
            $query = DB::table($table);
            if ($metric === 'invoices') {
                $query->whereBetween('created_at', [$start, $end]);
            }

            return $query->count();
        });
    }
}
