<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCentralAdmin
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $admin = $request->user('central');
        if (! $admin || ! $admin->is_active) {
            return redirect()->route('central.login');
        }
        foreach ($permissions as $permission) {
            abort_unless($admin->can($permission), 403);
        }
        $request->attributes->set('centralAdmin', $admin);

        return $next($request);
    }
}
