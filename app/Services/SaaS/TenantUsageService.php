<?php

namespace App\Services\SaaS;

use App\Models\Central\Tenant;
use App\Models\Central\TenantUsageMetric;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TenantUsageService
{
    public function calculate(Tenant $tenant): TenantUsageMetric
    {
        $metrics = $tenant->run(function () {
            $count = fn ($table, $query = null) => Schema::hasTable($table) ? ($query ? $query(DB::table($table))->count() : DB::table($table)->count()) : 0;

            return ['users_count' => $count('users'), 'branches_count' => $count('branches'), 'products_count' => $count('products'), 'customers_count' => $count('contacts'), 'invoices_count' => $count('invoices', fn ($q) => $q->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])), 'ai_requests_count' => $count('ai_usage_logs', fn ($q) => $q->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])), 'storage_mb' => 0];
        });

        return TenantUsageMetric::updateOrCreate(['tenant_id' => $tenant->id, 'period_start' => now()->startOfMonth()->toDateString(), 'period_end' => now()->endOfMonth()->toDateString()], $metrics);
    }
}
