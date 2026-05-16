<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        @if (!empty($faviconUrl))
            <link rel="icon" href="{{ $faviconUrl }}" @if (!empty($faviconMimeType)) type="{{ $faviconMimeType }}" @endif>
            <link rel="shortcut icon" href="{{ $faviconUrl }}" @if (!empty($faviconMimeType)) type="{{ $faviconMimeType }}" @endif>
            <link rel="apple-touch-icon" href="{{ $faviconUrl }}">
        @endif

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
