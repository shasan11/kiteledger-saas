<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenancyIsInitialized
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(tenancy()->initialized && tenant(), 404);

        return $next($request);
    }
}
