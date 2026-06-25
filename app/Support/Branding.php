<?php

namespace App\Support;

use App\Models\AppSetting;
use App\Services\Media\MediaStorageService;

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

        // Uploaded favicon → drop-in public/branding/favicon.png → shipped favicon.ico.
        return self::publicFileUrl($favicon)
            ?? (is_file(public_path('branding/favicon.png')) ? asset('branding/favicon.png') : null)
            ?? asset('favicon.ico');
    }

    /**
     * Active light-logo URL: the uploaded App Settings logo, else the drop-in
     * default at public/branding/logo.png, else null (UI shows its built-in SVG).
     */
    public static function logoUrl(): ?string
    {
        return self::brandUrl('logo', 'branding/logo.png');
    }

    /** Active dark-logo URL with the same fallback chain as {@see logoUrl()}. */
    public static function darkLogoUrl(): ?string
    {
        return self::brandUrl('dark_logo', 'branding/dark_logo.png');
    }

    /**
     * Resolve an App Settings image field, falling back to a bundled default
     * file in public/branding/ when nothing has been uploaded.
     */
    private static function brandUrl(string $field, string $defaultPublicPath): ?string
    {
        try {
            $uploaded = self::publicFileUrl(
                AppSetting::query()->orderBy('created_at')->value($field)
            );
        } catch (\Throwable) {
            $uploaded = null;
        }

        if ($uploaded) {
            return $uploaded;
        }

        if (is_file(public_path($defaultPublicPath))) {
            return asset($defaultPublicPath);
        }

        return null;
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

        return app(MediaStorageService::class)->url($path);
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
