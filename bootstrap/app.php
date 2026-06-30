<?php

use App\Http\Middleware\DisableRemoteViteHotFile;
use App\Http\Middleware\EnsureInstalled;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Prepended so an un-installed deployment is redirected to /install
        // before session/cookie middleware (which need APP_KEY) ever run.
        $middleware->web(prepend: [
            EnsureInstalled::class,
            DisableRemoteViteHotFile::class,
        ]);

        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // The installer posts before APP_KEY/session exist.
        $middleware->validateCsrfTokens(except: [
            'install',
            'install/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidArgumentException $exception, Request $request) {
            if ($request->is('api/pos*') || $request->is('api/pos-*')) {
                return response()->json([
                    'message' => $exception->getMessage(),
                ], 422);
            }

            return null;
        });
    })->create();
