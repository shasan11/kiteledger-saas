<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Storage;

class Branding
{
    /**
     * Returns the active favicon URL.
     * Falls back to /favicon.ico (the default file shipped in public/) when no
     * custom favicon has been uploaded in App Settings.
     */
    public static function faviconUrl(): string
    {
        try {
            $favicon = AppSetting::query()
                ->orderBy('created_at')
                ->value('favicon');
        } catch (\Throwable) {
            return asset('favicon.ico');
        }

        return self::publicFileUrl($favicon) ?? asset('favicon.ico');
    }

    public static function publicFileUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $path = trim($path);

        if (
            str_starts_with($path, 'http://') ||
            str_starts_with($path, 'https://')
        ) {
            return $path;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'public/')) {
            $path = substr($path, 7);
        }

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, 8);
        }

        if (!Storage::disk('public')->exists($path)) {
            return null;
        }

        return rtrim(config('app.url'), '/') . '/storage/' . $path;
    }

    public static function faviconMimeType(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        return match (strtolower(pathinfo(parse_url($url, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION))) {
            'ico' => 'image/x-icon',
            'svg' => 'image/svg+xml',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => null,
        };
    }
}
