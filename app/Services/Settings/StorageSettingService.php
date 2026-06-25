<?php

namespace App\Services\Settings;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageSettingService
{
    public const GROUP = 'storage';
    public const MASK = '********';

    private const SECRET_KEYS = [
        'aws_access_key_id',
        'aws_secret_access_key',
    ];

    private array $defaults = [
        'media_disk' => 'public',
        'aws_access_key_id' => null,
        'aws_secret_access_key' => null,
        'aws_default_region' => null,
        'aws_bucket' => null,
        'aws_url' => null,
        'aws_endpoint' => null,
        'aws_use_path_style_endpoint' => false,
        'aws_media_prefix' => '',
        'aws_visibility' => 'public',
    ];

    public function __construct(private DatabaseSettingService $settings)
    {
    }

    public function all(bool $masked = false): array
    {
        $stored = $this->settings->getGroup(self::GROUP);
        $values = $this->defaults;

        foreach ($values as $key => $default) {
            if (!array_key_exists($key, $stored)) {
                continue;
            }

            $values[$key] = in_array($key, self::SECRET_KEYS, true)
                ? $this->decrypt($stored[$key])
                : $stored[$key];
        }

        $values['media_disk'] = $values['media_disk'] === 's3' ? 's3' : 'public';
        $values['aws_use_path_style_endpoint'] = filter_var($values['aws_use_path_style_endpoint'], FILTER_VALIDATE_BOOLEAN);
        $values['aws_visibility'] = $values['aws_visibility'] === 'private' ? 'private' : 'public';
        $values['aws_media_prefix'] = trim((string) $values['aws_media_prefix'], '/');

        if ($masked) {
            foreach (self::SECRET_KEYS as $key) {
                $values[$key] = filled($values[$key]) ? self::MASK : null;
                $values["has_{$key}"] = filled($this->decrypt($stored[$key] ?? null));
            }
        }

        return $values;
    }

    public function save(array $input): array
    {
        $current = $this->all();
        $values = array_merge($current, $input);

        $values['media_disk'] = ($values['media_disk'] ?? 'public') === 's3' ? 's3' : 'public';
        $values['aws_use_path_style_endpoint'] = filter_var($values['aws_use_path_style_endpoint'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $values['aws_visibility'] = ($values['aws_visibility'] ?? 'public') === 'private' ? 'private' : 'public';
        $values['aws_media_prefix'] = trim((string) ($values['aws_media_prefix'] ?? ''), '/');

        foreach ($this->defaults as $key => $default) {
            if (in_array($key, self::SECRET_KEYS, true)) {
                $submitted = $input[$key] ?? null;
                if ($submitted === self::MASK || $submitted === null || $submitted === '') {
                    continue;
                }

                $this->settings->set($key, Crypt::encryptString((string) $submitted), self::GROUP);
                continue;
            }

            $this->settings->set($key, $values[$key] ?? $default ?? '', self::GROUP);
        }

        $this->settings->forgetGroup(self::GROUP);

        return $this->all(masked: true);
    }

    public function hasCredential(string $key): bool
    {
        return filled($this->all()[$key] ?? null);
    }

    public function mediaDisk(): string
    {
        return $this->all()['media_disk'] === 's3' ? 's3' : 'public';
    }

    public function s3Config(?array $overrides = null): array
    {
        $values = array_merge($this->all(), $overrides ?: []);

        return [
            'driver' => 's3',
            'key' => $values['aws_access_key_id'] ?? null,
            'secret' => $values['aws_secret_access_key'] ?? null,
            'region' => $values['aws_default_region'] ?? null,
            'bucket' => $values['aws_bucket'] ?? null,
            'url' => $values['aws_url'] ?? null,
            'endpoint' => $values['aws_endpoint'] ?? null,
            'use_path_style_endpoint' => filter_var($values['aws_use_path_style_endpoint'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'visibility' => ($values['aws_visibility'] ?? 'public') === 'private' ? 'private' : 'public',
            'throw' => true,
        ];
    }

    public function test(array $overrides = []): void
    {
        $values = array_merge($this->all(), $overrides);
        $prefix = trim((string) ($values['aws_media_prefix'] ?? ''), '/');
        $path = trim($prefix.'/kiteledger-storage-test-'.Str::uuid().'.txt', '/');
        $disk = Storage::build($this->s3Config($values));

        $disk->put($path, 'KiteLedger storage test '.now()->toISOString(), [
            'visibility' => ($values['aws_visibility'] ?? 'public') === 'private' ? 'private' : 'public',
        ]);

        $disk->delete($path);
    }

    private function decrypt(?string $value): ?string
    {
        if (!filled($value)) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
