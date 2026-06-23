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

        $state = $this->startInstallerWhenNeeded($status, $launcher, $request->boolean('reset'));

        return view('vendor.installer.database-progress', [
            'status' => $state,
        ]);
    }

    public function status(WebInstallStatus $status, WebInstallLauncher $launcher): JsonResponse
    {
        $this->forceEnglish();

        if (InstalledState::isInstalled()) {
            return response()->json([
                ...$status->read(),
                'state' => 'succeeded',
                'step' => 'Finished',
                'message' => 'Application has been successfully installed.',
            ]);
        }

        return response()->json($this->startInstallerWhenNeeded($status, $launcher));
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

    private function startInstallerWhenNeeded(WebInstallStatus $status, WebInstallLauncher $launcher, bool $reset = false): array
    {
        if ($reset) {
            $status->reset();
        }

        $state = $status->read();

        if (($state['state'] ?? null) === 'succeeded') {
            $status->reset();
            $state = $status->read();
        }

        if ($status->isStale($state)) {
            $status->failed('The previous installer worker stopped updating. Start the install again.');

            return $status->read();
        }

        if (($state['state'] ?? null) !== 'idle') {
            return $state;
        }

        $state = $status->start();

        if (app()->environment('testing')) {
            $status->failed('Installer worker is disabled during automated tests.');

            return $status->read();
        }

        try {
            $launcher->launch((string) $state['token']);
        } catch (Throwable $e) {
            $status->failed($e->getMessage());

            return $status->read();
        }

        return $state;
    }
}
