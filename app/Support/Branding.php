<?php

namespace App\Support;

use App\Models\AppSetting;
use App\Services\Media\MediaStorageService;
use Throwable;

class Branding
{
    public static function logoUrl(?string $uploaded = null): string
    {
        return self::brandUrl('logo', $uploaded, ['branding/light_logo.png']);
    }

    public static function darkLogoUrl(?string $uploaded = null): string
    {
        return self::brandUrl('dark_logo', $uploaded, ['branding/dark_logo.png']);
    }

    public static function faviconUrl(?string $uploaded = null): string
    {
        return self::brandUrl('favicon', $uploaded, ['branding/favicon.png', 'favicon.ico']);
    }

    private static function brandUrl(string $field, ?string $uploaded, array $defaults): string
    {
        if ($uploaded === null) {
            try {
                $uploaded = AppSetting::query()->orderBy('created_at')->value($field);
            } catch (Throwable) {
                $uploaded = null;
            }
        }

        $uploadedUrl = self::publicFileUrl($uploaded);
        if ($uploadedUrl) {
            return $uploadedUrl;
        }

        foreach ($defaults as $path) {
            if (is_file(public_path($path))) {
                return asset($path);
            }
        }

        return asset($defaults[0]);
    }

    public static function publicFileUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $path = trim($path);
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
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
        if (! $url) {
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
