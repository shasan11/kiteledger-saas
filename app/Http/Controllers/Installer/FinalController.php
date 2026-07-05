<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class FinalController extends Controller
{
    public function finish(InstalledFileManager $fileManager): View|RedirectResponse
    {
        if (! session()->pull('kiteledger_install_succeeded', false)) {
            return redirect()
                ->route('kiteledger.install.type')
                ->withErrors(['database' => 'Complete the database installation before finishing setup.']);
        }

        $fileManager->update();

        return view('vendor.installer.finished');
    }
}
