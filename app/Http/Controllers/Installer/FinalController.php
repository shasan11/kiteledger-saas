<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Services\Installer\InstallerDiagnosticsService;
use App\Support\Installer\InstalledState;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class FinalController extends Controller
{
    public function finish(InstalledFileManager $fileManager, InstallerDiagnosticsService $diagnostics): View|RedirectResponse
    {
        $status = InstalledState::installerStatus();
        $installSucceeded = session()->pull('kiteledger_install_succeeded', false)
            || (bool) ($status['install_succeeded'] ?? false);

        if (! $installSucceeded) {
            return redirect()
                ->route('kiteledger.install.type')
                ->withErrors(['database' => 'Complete the database installation before finishing setup.']);
        }

        $fileManager->update();

        $mode = (string) session('kiteledger_provisioning_mode', $status['provisioning_mode'] ?? config('saas.database.mode', 'pool'));

        return view('vendor.installer.finished', [
            'adminEmail' => (string) session('kiteledger_admin_email', $status['admin_email'] ?? env('CENTRAL_ADMIN_EMAIL', '')),
            'adminLoginUrl' => url('/'.trim(config('saas.admin_path', 'admin'), '/').'/login'),
            'provisioningMode' => $mode,
            'provisioningStatus' => (string) session('kiteledger_provisioning_status', $status['provisioning_status'] ?? 'Review the tenant database configuration before creating a company.'),
            'diagnostics' => $diagnostics->postInstall(),
            'projectPath' => base_path(),
            'phpBinary' => PHP_BINARY,
        ]);
    }
}
