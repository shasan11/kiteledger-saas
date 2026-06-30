<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DisableRemoteViteHotFile
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower($request->getHost());

        if (! in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            app(Vite::class)->useHotFile(storage_path('framework/vite.hot.disabled'));
        }

        return $next($request);
    }
}
