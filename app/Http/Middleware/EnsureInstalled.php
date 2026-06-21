<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Install\InstallController;
use App\Support\Installer\InstalledState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Funnels an un-installed deployment to the web installer. A no-op for any
 * already-installed system (the common case), so it is safe on the web group.
 */
class EnsureInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->hasAppKey() && $request->is('install', 'install/*')) {
            return $this->handleInstallerWithoutAppKey($request);
        }

        // Never gate the automated test suite (fresh DBs have no users/lock).
        if (app()->environment('testing')) {
            return $next($request);
        }

        if (InstalledState::isInstalled()) {
            return $next($request);
        }

        // Let the installer, health check and static assets through.
        if ($request->is('install', 'install/*', 'up', 'build/*', 'storage/*', 'vendor/*', 'favicon.ico')) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Application is not installed.'], 503);
        }

        return redirect('/install');
    }

    private function hasAppKey(): bool
    {
        return filled((string) config('app.key'));
    }

    private function handleInstallerWithoutAppKey(Request $request): Response
    {
        $controller = app(InstallController::class);
        $path = trim($request->path(), '/');

        $result = match ([$request->method(), $path]) {
            ['GET', 'install'] => $controller->index($request),
            ['GET', 'install/requirements'] => $controller->requirements(),
            ['POST', 'install/database'] => $controller->testDatabase($request),
            ['POST', 'install/run'] => $controller->run($request),
            default => abort(404),
        };

        return $result instanceof Response ? $result : response($result);
    }
}
