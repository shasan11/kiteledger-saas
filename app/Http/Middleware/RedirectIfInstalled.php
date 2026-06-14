<?php

namespace App\Http\Middleware;

use App\Support\Installer\InstalledState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks the installer once the application is installed.
 */
class RedirectIfInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (InstalledState::isInstalled()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Application is already installed.'], 403);
            }

            return redirect('/');
        }

        return $next($request);
    }
}
