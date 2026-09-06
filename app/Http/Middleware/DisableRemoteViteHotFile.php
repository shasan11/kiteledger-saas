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

        $isLoopbackHost = in_array($host, ['localhost', '127.0.0.1', '::1'], true)
            || str_ends_with($host, '.localhost');

        if (! $isLoopbackHost && ! config('app.vite_hot_reload')) {
            app(Vite::class)->useHotFile(storage_path('framework/vite.hot.disabled'));
        }

        return $next($request);
    }
}
