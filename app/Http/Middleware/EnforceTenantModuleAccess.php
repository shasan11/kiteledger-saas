<?php

namespace App\Http\Middleware;

use App\Contracts\SaaS\FeatureResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceTenantModuleAccess
{
    public function __construct(private FeatureResolver $features) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! tenant() && app()->environment('testing') && config('saas.allow_uninitialized_tenant_models')) {
            return $next($request);
        }

        $path = trim((string) preg_replace('#^api/#', '', $request->path()), '/');
        $feature = match (true) {
            str_starts_with($path, 'pos') => 'pos',
            str_starts_with($path, 'warehouse') => 'warehouses',
            str_starts_with($path, 'payroll'), str_starts_with($path, 'payslip'), str_starts_with($path, 'salary-') => 'payroll',
            str_starts_with($path, 'employee'), str_starts_with($path, 'leave-'), str_starts_with($path, 'attendance') => 'hrm',
            str_starts_with($path, 'crm'), str_starts_with($path, 'leads'), str_starts_with($path, 'deals') => 'crm',
            str_starts_with($path, 'ai/'), str_contains($path, '/ai-summary') => 'ai',
            str_starts_with($path, 'reports/') => 'advanced_reports',
            str_starts_with($path, 'document-uploads') => 'document_extraction',
            str_starts_with($path, 'products'), str_starts_with($path, 'inventory-'), str_starts_with($path, 'production-') => 'inventory',
            default => null,
        };

        if ($feature && ! $this->features->allows(tenant(), $feature)) {
            return response()->json(['message' => 'Your plan does not include this feature.', 'code' => 'feature_unavailable', 'feature' => $feature], 403);
        }

        return $next($request);
    }
}
