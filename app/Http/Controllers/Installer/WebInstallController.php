<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallLauncher;
use App\Support\Installer\WebInstallStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Throwable;

class WebInstallController extends Controller
{
    public function database(Request $request, WebInstallStatus $status, WebInstallLauncher $launcher): View|RedirectResponse
    {
        $this->forceEnglish();

        if (InstalledState::isInstalled()) {
            return redirect('/login');
        }

        if ($request->boolean('reset')) {
            $status->reset();
        }

        $state = $status->read();

        if (($state['state'] ?? null) === 'succeeded') {
            $status->reset();
            $state = $status->read();
        }

        if ($status->isStale($state)) {
            $status->failed('The previous installer worker stopped updating. Start the install again.');
            $state = $status->read();
        }

        if (! in_array($state['state'], ['running', 'succeeded'], true)) {
            $state = $status->start();

            if (app()->environment('testing')) {
                $status->failed('Installer worker is disabled during automated tests.');
                $state = $status->read();
            } else {
                try {
                    $launcher->launch((string) $state['token']);
                } catch (Throwable $e) {
                    $status->failed($e->getMessage());
                    $state = $status->read();
                }
            }
        }

        return view('vendor.installer.database-progress', [
            'status' => $state,
        ]);
    }

    public function status(WebInstallStatus $status): JsonResponse
    {
        $this->forceEnglish();

        return response()->json($status->read());
    }

    public function final(WebInstallStatus $status): View|RedirectResponse
    {
        $this->forceEnglish();

        $state = $status->read();

        if (! InstalledState::isInstalled()) {
            if (($state['state'] ?? null) !== 'succeeded') {
                return redirect('/install/database');
            }

            InstalledState::mark();
        }

        session()->flash('message', [
            'status' => 'success',
            'message' => 'Application has been successfully installed.',
        ]);

        return view('vendor.installer.finished');
    }

    private function forceEnglish(): void
    {
        app()->setLocale('en');
        config(['app.locale' => 'en']);
    }
}
