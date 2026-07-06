<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Support\Installer\InstalledState;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class RecoveryController extends Controller
{
    public function show(): View|RedirectResponse
    {
        if (! InstalledState::hasInstallLock()) {
            return redirect('/install');
        }

        abort_if(InstalledState::isInstalled(), 404);

        return view('vendor.installer.recover', [
            'problems' => InstalledState::recoveryProblems(),
            'hasStaleConfigCache' => is_file(base_path('bootstrap/cache/config.php')),
            'resetAllowed' => true,
        ]);
    }

    public function reset(): RedirectResponse
    {
        abort_unless(InstalledState::hasInstallLock() && ! InstalledState::isInstalled(), 404);
        InstalledState::clear();

        return redirect('/install')->with('message', 'Installer lock reset. Continue the installation with valid settings.');
    }
}
