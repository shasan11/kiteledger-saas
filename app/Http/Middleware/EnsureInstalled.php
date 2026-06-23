<?php

namespace App\Http\Middleware;

use App\Support\Installer\InstalledState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Funnels an un-installed deployment to the Froiden web installer (/install).
 * A no-op once installed (the common case), so it is safe on the web group.
 * Also auto-creates .env + APP_KEY on first boot so the app can be unzipped and
 * opened without a shell step.
 */
class EnsureInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        // First boot on a fresh server: create .env + APP_KEY automatically.
        $this->bootstrapEnvironment($request);

        $path = trim($request->path(), '/');
        $isInstall = $path === 'install' || str_starts_with($path, 'install/');

        // On the install screens, keep benign PHP warnings (e.g. PHP 8.4's
        // tempnam temp-dir notice on tight-permission hosts) out of the response
        // and from being promoted to exceptions. Real errors still surface.
        if ($isInstall && ! app()->environment('testing')) {
            @ini_set('display_errors', '0');
            error_reporting(error_reporting() & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
        }

        // Never gate the automated test suite (fresh DBs have no lock).
        if (app()->environment('testing')) {
            return $next($request);
        }

        if (InstalledState::isInstalled()) {
            return $next($request);
        }

        // Let the installer, health check and static assets through.
        if ($isInstall || $request->is('up', 'build/*', 'storage/*', 'vendor/*', 'favicon.ico')) {
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
     * with no environment and no key. On the first web request we create .env
     * from .env.example (or a minimal default) and generate APP_KEY, then push
     * the key into the running config so THIS request can already use it.
     */
    private function bootstrapEnvironment(Request $request): void
    {
        // Tests manage their own env/key — never touch the real .env from here.
        if (app()->environment('testing')) {
            return;
        }

        $envPath = base_path('.env');

        try {
            if (! is_file($envPath)) {
                $example = base_path('.env.example');
                $contents = is_file($example)
                    ? (string) file_get_contents($example)
                    : "APP_NAME=KiteLedger\nAPP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=\n";

                // Point APP_URL at the actual host so the installer assets resolve.
                $host = rtrim($request->getSchemeAndHttpHost(), '/');
                $contents = $this->setEnvValue($contents, 'APP_URL', $host);

                if (@file_put_contents($envPath, $contents, LOCK_EX) === false) {
                    return; // read-only filesystem
                }

                config(['app.url' => $host]);
            }

            if (! $this->hasAppKey()) {
                $key = 'base64:'.base64_encode(random_bytes(32));
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
            // Never let bootstrapping break the request.
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
}
