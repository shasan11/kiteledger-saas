<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Install\InstallController;
use App\Support\Installer\EnvWriter;
use App\Support\Installer\InstalledState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Funnels an un-installed deployment to the web installer. A no-op for any
 * already-installed system (the common case), so it is safe on the web group.
 */
class EnsureInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        // First boot on a fresh server: create .env + APP_KEY automatically so
        // the user can just upload the files and open the URL — no shell step
        // required. Best-effort; if the filesystem is read-only the installer
        // engine still runs key-free.
        $this->bootstrapEnvironment($request);

        $path = trim($request->path(), '/');
        $isSetup = $path === 'install/setup' || str_starts_with($path, 'install/setup/');
        $isFroidenIntro = ! $isSetup && ($path === 'install' || str_starts_with($path, 'install/'));

        // During the install screens, keep benign PHP warnings (e.g. PHP 8.4's
        // tempnam temp-dir notice on tight-permission hosts) from being echoed
        // into responses or promoted to exceptions by Laravel's debug handler.
        // Real errors/exceptions still surface.
        if (($isSetup || $isFroidenIntro) && ! app()->environment('testing')) {
            @ini_set('display_errors', '0');
            error_reporting(error_reporting() & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
        }

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
     * Ensure a usable .env with an APP_KEY exists on first boot.
     *
     * Laravel loads .env before any middleware, so a freshly uploaded app boots
     * with no environment and no key. Here, on the first web request, we create
     * .env from .env.example (or a minimal default) and generate APP_KEY, then
     * push the key into the running config so THIS request can already use it.
     * Subsequent requests boot normally from the written file.
     */
    private function bootstrapEnvironment(Request $request): void
    {
        // Tests manage their own env/key — never touch the real .env from here.
        if (app()->environment('testing')) {
            return;
        }

        // Make the runtime cache dirs writable on first boot. Laravel writes the
        // package manifest and real-time facade cache via tempnam(dirname)+rename;
        // if those dirs aren't writable (common when a buyer just unzips and
        // opens the URL without running chmod), PHP 8.4+ warns "tempnam(): file
        // created in the system's temporary directory" and the cross-device
        // rename can fail. Creating + chmod-ing them here prevents that.
        $this->ensureWritableRuntimeDirs();

        $envPath = base_path('.env');

        try {
            if (! is_file($envPath)) {
                $example = base_path('.env.example');
                $contents = is_file($example)
                    ? (string) file_get_contents($example)
                    : "APP_NAME=KiteLedger\nAPP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=\n";

                // Point APP_URL at the actual host so the installer's assets
                // (Froiden CSS, etc.) resolve before the user confirms the URL.
                $host = rtrim($request->getSchemeAndHttpHost(), '/');
                $contents = $this->setEnvValue($contents, 'APP_URL', $host);

                if (@file_put_contents($envPath, $contents, LOCK_EX) === false) {
                    return; // read-only filesystem — engine still runs key-free
                }

                config(['app.url' => $host]);
            }

            if (! $this->hasAppKey()) {
                $key = EnvWriter::generateKey();
                $current = is_file($envPath) ? (string) file_get_contents($envPath) : '';
                $updated = $this->setEnvValue($current, 'APP_KEY', $key);

                if (@file_put_contents($envPath, $updated, LOCK_EX) !== false) {
                    // Make the key live for the rest of this request, and reset
                    // the already-resolved encrypter so it picks up the new key.
                    config(['app.key' => $key]);
                    app()->forgetInstance('encrypter');
                }
            }
        } catch (Throwable) {
            // Never let bootstrapping break the request; fall back to key-free.
        }
    }

    /**
     * Create and make writable the runtime directories Laravel writes to during
     * boot (cache, sessions, views, logs, bootstrap/cache). Best-effort and
     * cheap; a no-op once the app is installed. Stops the PHP 8.4+ tempnam
     * warning at its source on hosts where the web user can chmod its own files.
     */
    private function ensureWritableRuntimeDirs(): void
    {
        // Only relevant before/during install; skip the work afterwards.
        if (is_file(InstalledState::lockPath())) {
            return;
        }

        $dirs = [
            storage_path('framework/cache/data'),
            storage_path('framework/views'),
            storage_path('framework/sessions'),
            storage_path('logs'),
            storage_path('app/public'),
            base_path('bootstrap/cache'),
        ];

        foreach ($dirs as $dir) {
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }

            if (is_dir($dir) && ! is_writable($dir)) {
                @chmod($dir, 0775);
            }
        }
    }

    /**
     * Replace (or append) a KEY=value line in raw .env contents.
     */
    private function setEnvValue(string $contents, string $key, string $value): string
    {
        $line = $key.'='.$value;

        if (preg_match('/^'.preg_quote($key, '/').'=.*$/m', $contents)) {
            return (string) preg_replace('/^'.preg_quote($key, '/').'=.*$/m', $line, $contents, 1);
        }

        return rtrim($contents, "\r\n")."\n".$line."\n";
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
