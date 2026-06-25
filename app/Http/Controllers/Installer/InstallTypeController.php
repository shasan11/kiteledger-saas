<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Adds a "Fresh vs Demo data" choice to the Froiden web installer, between the
 * permissions step and the database (migrate + seed) step.
 *
 * The choice is stored in the session and read by FroidenDatabaseManager::seed()
 * to decide which seeder to run. Demo data is NEVER seeded unless the user
 * explicitly picks it here.
 */
class InstallTypeController extends Controller
{
    public const SESSION_KEY = 'kiteledger_install_type';

    public function show()
    {
        return view('vendor.installer.installtype');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'install_type' => ['required', 'in:fresh,quick,full'],
        ]);

        session([self::SESSION_KEY => $validated['install_type']]);

        // Hand control back to the Froiden database step, which runs migrate+seed.
        return redirect()->route('LaravelInstaller::database');
    }
}
