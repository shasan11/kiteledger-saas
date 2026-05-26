<?php

namespace App\Services\Settings;

use App\Models\GeneralSetting;
use Illuminate\Support\Facades\Cache;

class DatabaseSettingService
{
    private const CACHE_TTL = 300; // 5 minutes
    private const CACHE_PREFIX = 'gs:';

    public function get(string $key, mixed $default = null, ?string $group = null): mixed
    {
        $cacheKey = self::CACHE_PREFIX . ($group ?? '_') . ':' . $key;

        $value = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($key, $group) {
            $query = GeneralSetting::query()->where('key', $key);
            if ($group !== null) {
                $query->where('group', $group);
            }
            return $query->value('value');
        });

        return $value ?? $default;
    }

    public function set(string $key, mixed $value, string $group = 'general'): void
    {
        $val = is_array($value) || is_object($value) ? json_encode($value) : (string) $value;

        GeneralSetting::updateOrCreate(
            ['key' => $key, 'group' => $group],
            ['value' => $val, 'active' => true]
        );

        Cache::forget(self::CACHE_PREFIX . $group . ':' . $key);
        Cache::forget(self::CACHE_PREFIX . '_:' . $key);
        Cache::forget(self::CACHE_PREFIX . 'group:' . $group);
    }

    public function getGroup(string $group): array
    {
        return Cache::remember(self::CACHE_PREFIX . 'group:' . $group, self::CACHE_TTL, function () use ($group) {
            return GeneralSetting::query()
                ->where('group', $group)
                ->pluck('value', 'key')
                ->toArray();
        });
    }

    public function bool(string $key, bool $default = false, ?string $group = null): bool
    {
        $value = $this->get($key, null, $group);
        if ($value === null) return $default;
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public function int(string $key, int $default = 0, ?string $group = null): int
    {
        $value = $this->get($key, null, $group);
        return $value === null ? $default : (int) $value;
    }

    public function float(string $key, float $default = 0.0, ?string $group = null): float
    {
        $value = $this->get($key, null, $group);
        return $value === null ? $default : (float) $value;
    }

    public function string(string $key, string $default = '', ?string $group = null): string
    {
        $value = $this->get($key, null, $group);
        return $value === null ? $default : (string) $value;
    }

    public function forgetGroup(string $group): void
    {
        Cache::forget(self::CACHE_PREFIX . 'group:' . $group);
        foreach (GeneralSetting::query()->where('group', $group)->pluck('key') as $key) {
            Cache::forget(self::CACHE_PREFIX . $group . ':' . $key);
            Cache::forget(self::CACHE_PREFIX . '_:' . $key);
        }
    }
}
