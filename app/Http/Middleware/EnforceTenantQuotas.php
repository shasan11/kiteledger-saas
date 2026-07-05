<?php

namespace App\Http\Middleware;

use App\Contracts\SaaS\QuotaManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceTenantQuotas
{
    public function __construct(private QuotaManager $quotas) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! tenant() && app()->environment('testing') && config('saas.allow_uninitialized_tenant_models')) {
            return $next($request);
        }

        $reservations = [];
        try {
            if ($request->isMethod('POST')) {
                $metric = $this->resourceMetric($request);
                if ($metric) {
                    $id = $this->quotas->reserve(tenant(), $metric, $this->quantity($request));
                    if ($id) {
                        $reservations[] = $id;
                    }
                }
            }
            $api = $this->quotas->reserve(tenant(), 'api_requests');
            if ($api) {
                $reservations[] = $api;
            }

            $response = $next($request);
            foreach ($reservations as $id) {
                $response->isSuccessful() ? $this->quotas->finalize($id) : $this->quotas->release($id);
            }

            return $response;
        } catch (\Throwable $e) {
            foreach ($reservations as $id) {
                $this->quotas->release($id);
            }
            throw $e;
        }
    }

    private function resourceMetric(Request $request): ?string
    {
        $path = trim((string) preg_replace('#^api/#', '', $request->path()), '/');
        foreach (['users' => 'users', 'branches' => 'branches', 'products' => 'products', 'contacts' => 'customers', 'invoices' => 'invoices', 'warehouses' => 'warehouses'] as $prefix => $metric) {
            if ($path === $prefix || $path === $prefix.'/bulk') {
                return $metric;
            }
        }
        if (str_starts_with($path, 'document-uploads')) {
            return 'storage_mb';
        }
        if (str_starts_with($path, 'ai/')) {
            return 'ai_requests';
        }

        return null;
    }

    private function quantity(Request $request): int
    {
        if ($request->hasFile('file')) {
            return max(1, (int) ceil($request->file('file')->getSize() / 1048576));
        }
        $rows = $request->input('rows', $request->input('items'));

        return is_array($rows) ? max(1, count($rows)) : 1;
    }
}
