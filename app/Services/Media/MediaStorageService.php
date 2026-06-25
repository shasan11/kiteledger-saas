<?php

namespace App\Services\Media;

use App\Services\Settings\StorageSettingService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

class MediaStorageService
{
    public function __construct(private StorageSettingService $settings)
    {
    }

    public function disk(): string
    {
        $disk = $this->settings->mediaDisk();

        if ($disk === 's3') {
            Config::set('filesystems.disks.s3', $this->settings->s3Config());
        }

        return $disk;
    }

    public function store(UploadedFile $file, string $path): string
    {
        $prefix = $this->prefix();
        $directory = trim($prefix.'/'.trim($path, '/'), '/');

        return $file->store($directory, [
            'disk' => $this->disk(),
            'visibility' => $this->visibility(),
        ]);
    }

    public function url(?string $path): ?string
    {
        $path = $this->normalizePath($path);

        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if ($this->existsOnConfiguredDisk($path)) {
            return Storage::disk($this->disk())->url($path);
        }

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->url($path);
        }

        return null;
    }

    public function delete(?string $path): void
    {
        $path = $this->normalizePath($path);

        if (!$path) {
            return;
        }

        foreach (array_unique([$this->disk(), 'public']) as $disk) {
            try {
                if (Storage::disk($disk)->exists($path)) {
                    Storage::disk($disk)->delete($path);
                }
            } catch (\Throwable) {
                // Missing credentials should not break record updates/deletes.
            }
        }
    }

    public function normalizePath(?string $path): ?string
    {
        if (!$path) {
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

        return $path;
    }

    private function existsOnConfiguredDisk(string $path): bool
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return true;
        }

        try {
            return Storage::disk($this->disk())->exists($path);
        } catch (\Throwable) {
            return false;
        }
    }

    private function prefix(): string
    {
        return trim((string) ($this->settings->all()['aws_media_prefix'] ?? ''), '/');
    }

    private function visibility(): string
    {
        return ($this->settings->all()['aws_visibility'] ?? 'public') === 'private' ? 'private' : 'public';
    }
}
