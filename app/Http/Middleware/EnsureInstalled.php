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
        $path = trim($request->path(), '/');
        $isSetup = $path === 'install/setup' || str_starts_with($path, 'install/setup/');
        $isFroidenIntro = ! $isSetup && ($path === 'install' || str_starts_with($path, 'install/'));

        // Our engine (/install/setup) strips session middleware and runs fine
        // without an APP_KEY. The Froiden intro screens use the session-backed
        // web stack, which needs a key. So when no key exists yet, serve the
        // engine directly and skip the Froiden screens entirely.
        if (! $this->hasAppKey()) {
            if ($isSetup) {
                return $this->handleSetupWithoutAppKey($request);
            }

            if ($isFroidenIntro) {
                return redirect('/install/setup');
            }
        }

        // Never gate the automated test suite (fresh DBs have no users/lock).
        if (app()->environment('testing')) {
            return $next($request);
        }

        if (InstalledState::isInstalled()) {
            return $next($request);
        }

        // Let the installer (Froiden intro + our engine), health check and
        // static assets through.
        if ($isFroidenIntro || $isSetup || $request->is('up', 'build/*', 'storage/*', 'vendor/*', 'favicon.ico')) {
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

    /**
     * Serve the /install/setup engine directly when no APP_KEY exists yet,
     * bypassing the session/cookie middleware that would otherwise fail.
     */
    private function handleSetupWithoutAppKey(Request $request): Response
    {
        $controller = app(InstallController::class);
        $path = trim($request->path(), '/');

        $result = match ([$request->method(), $path]) {
            ['GET', 'install/setup'] => $controller->index($request),
            ['GET', 'install/setup/requirements'] => $controller->requirements(),
            ['POST', 'install/setup/database'] => $controller->testDatabase($request),
            ['POST', 'install/setup/run'] => $controller->run($request),
            default => abort(404),
        };

        return $result instanceof Response ? $result : response($result);
    }
}
