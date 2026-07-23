<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Services\Installer\TenancyInstallationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class TenancyController extends Controller
{
    public function status(TenancyInstallationService $installer): JsonResponse
    {
        return response()->json([
            'installed' => $installer->installed(),
            'requirements' => $installer->requirements(),
            'permissions' => $installer->permissions(),
            'tenant_provisioning_mode' => config('saas.db_provisioning_mode'),
        ]);
    }

    public function license(Request $request): JsonResponse
    {
        $data = $request->validate(['purchase_code' => ['nullable', 'string', 'max:255']]);
        if (! config('installer.license_validation_enabled')) return response()->json(['valid' => true]);
        abort_unless(filled(config('installer.license_validation_endpoint')), 503, 'License validation is unavailable.');
        $response = Http::asJson()->timeout(15)->post(config('installer.license_validation_endpoint'), ['purchase_code' => $data['purchase_code']]);

        return response()->json(['valid' => $response->successful() && (bool) $response->json('valid')]);
    }

    public function tenantProvisioning(Request $request, TenancyInstallationService $installer): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', Rule::in(['manual', 'mysql', 'cpanel'])],
            'host' => ['nullable', 'string'], 'port' => ['nullable', 'integer'],
            'database' => ['nullable', 'string'], 'username' => ['nullable', 'string'], 'password' => ['nullable', 'string'],
        ]);
        $valid = $installer->testTenantProvisioning($data['mode'], $data);

        return response()->json(['valid' => $valid, 'mode' => $data['mode']]);
    }
}
