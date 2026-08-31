<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Support\Installer\InstalledState;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Illuminate\Http\RedirectResponse;

class DatabaseController extends Controller
{
    public function __construct(private DatabaseManager $databaseManager) {}

    public function database(): RedirectResponse
    {
        @set_time_limit(0);
        $response = $this->databaseManager->migrateAndSeed();

        if (($response['status'] ?? null) !== 'success') {
            return redirect()
                ->route('kiteledger.install.type')
                ->withErrors(['database' => $response['message'] ?? 'Database installation failed.']);
        }

        session(['kiteledger_install_succeeded' => true]);
        InstalledState::putInstallerStatus([
            'install_succeeded' => true,
            'database_installed_at' => now()->toIso8601String(),
        ]);

        return redirect()->route('LaravelInstaller::final')->with(['message' => $response]);
    }
}
