<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        @php
            // faviconUrl is always set (custom upload or default /favicon.ico)
            $resolvedFavicon  = $faviconUrl ?? asset('favicon.ico');
            $resolvedMimeType = $faviconMimeType ?? 'image/x-icon';
        @endphp
        <link rel="icon" href="{{ $resolvedFavicon }}" type="{{ $resolvedMimeType }}">
        <link rel="shortcut icon" href="{{ $resolvedFavicon }}" type="{{ $resolvedMimeType }}">
        <link rel="apple-touch-icon" href="{{ $resolvedFavicon }}">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
