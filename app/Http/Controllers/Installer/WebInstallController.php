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
    public function database(Request $request, WebInstallStatus $status): View|RedirectResponse
    {
        $this->forceEnglish();

        if (InstalledState::isInstalled()) {
            return redirect('/install/final');
        }

        if ($request->boolean('reset')) {
            $status->reset();
        }

        return view('vendor.installer.database-progress', [
            'status' => $status->read(),
        ]);
    }

    public function start(Request $request, WebInstallStatus $status, WebInstallLauncher $launcher): JsonResponse
    {
        $this->forceEnglish();

        if (InstalledState::isInstalled()) {
            $status->succeeded('Application has been successfully installed.');

            return response()->json($status->read());
        }

        if ($request->boolean('reset')) {
            $status->reset();
        }

        $state = $status->read();

        if (($state['state'] ?? null) === 'succeeded' || ($state['state'] ?? null) === 'failed') {
            return response()->json($state);
        }

        if (($state['state'] ?? null) === 'running' && $status->hasWorkerStarted($state)) {
            return response()->json($state);
        }

        $this->launchWorker($status, $launcher, $state);

        return response()->json($status->read());
    }

    public function status(WebInstallStatus $status, WebInstallLauncher $launcher): JsonResponse
    {
        $this->forceEnglish();

        if (InstalledState::isInstalled()) {
            $status->succeeded('Application has been successfully installed.');

            return response()->json($status->read());
        }

        $state = $status->read();

        // cPanel can serve stale compiled Blade/JS that polls status directly.
        // Keep this endpoint free of migration/seed work, but allow it to
        // bootstrap the detached CLI worker so old JS cannot loop forever on
        // the idle "Installer has not started" payload.
        if (($state['state'] ?? 'idle') === 'idle') {
            $this->launchWorker($status, $launcher, $state);
        }

        return response()->json($status->read());
    }

    public function final(WebInstallStatus $status): View|RedirectResponse
    {
        $this->forceEnglish();

        if (! InstalledState::isInstalled()) {
            if (($status->read()['state'] ?? null) !== 'succeeded') {
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

    private function launchWorker(WebInstallStatus $status, WebInstallLauncher $launcher, array $state): void
    {
        if (($state['state'] ?? null) === 'running' && $status->hasWorkerStarted($state)) {
            return;
        }

        if (($state['state'] ?? 'idle') === 'idle') {
            $status->begin();
        }

        try {
            $command = $launcher->launch();
            $status->workerStarted($command);
        } catch (Throwable $e) {
            $status->failed($e->getMessage() ?: 'The installer worker could not be started.');
        }
    }
}
