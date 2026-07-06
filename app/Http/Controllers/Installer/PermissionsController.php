<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Services\Installer\InstallerDiagnosticsService;
use Illuminate\View\View;

class PermissionsController extends Controller
{
    public function permissions(InstallerDiagnosticsService $diagnostics): View
    {
        return view('vendor.installer.permissions', ['checks' => $diagnostics->preflight()]);
    }
}
