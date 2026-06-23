<?php

namespace App\Http\Controllers\Installer;

use App\Http\Controllers\Controller;
use App\Services\Installer\WebDatabaseInstaller;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Throwable;

/**
 * Poll-driven web installer. Migrate + seed are split into phases that run one
 * per status poll, so no single request exceeds the web server's proxy timeout
 * and no fragile background process is needed (works on shared/FastPanel hosts).
 */
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

        // Render fast — the work happens in the status polls below.
        return view('vendor.installer.database-progress', [
            'status' => $status->read(),
        ]);
    }

    public function status(WebInstallStatus $status, WebDatabaseInstaller $installer): JsonResponse
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

        @set_time_limit(0);
        @ini_set('memory_limit', '-1');
        @ini_set('display_errors', '0');

        $state = $status->read();

        if (($state['state'] ?? 'idle') === 'idle') {
            $state = $status->begin($installer->steps());
        }

        // Another poll is already executing a phase — just report progress.
        if (($state['state'] ?? null) === 'running' && ! $status->isLocked($state)) {
            $this->runNextPhase($status, $installer, $state);
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

    private function runNextPhase(WebInstallStatus $status, WebDatabaseInstaller $installer, array $state): void
    {
        $steps = $installer->steps();
        $phase = (int) ($state['phase'] ?? 0);

        // All phases done → write the install lock and finish.
        if ($phase >= count($steps)) {
            InstalledState::mark();
            $status->succeeded('Application has been successfully installed.');

            return;
        }

        $status->lock();

        try {
            $installer->runStep($steps[$phase], function (string $message, ?string $step = null) use ($status): void {
                $status->progress($message, $step);
            });

            $status->advance();
            $status->unlock();

            // If that was the last phase, finish now.
            if (($phase + 1) >= count($steps)) {
                InstalledState::mark();
                $status->succeeded('Application has been successfully installed.');
            }
        } catch (Throwable $e) {
            $status->failed($e->getMessage() ?: 'Installation failed.');
        }
    }

    private function forceEnglish(): void
    {
        app()->setLocale('en');
        config(['app.locale' => 'en']);
    }
}
