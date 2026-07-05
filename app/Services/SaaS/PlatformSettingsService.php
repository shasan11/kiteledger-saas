<?php

namespace App\Services\SaaS;

use App\Models\Central\PlatformSetting;

class PlatformSettingsService
{
    public function get(string $key, mixed $default = null): mixed
    {
        return PlatformSetting::query()->where('key', $key)->first()?->value ?? $default;
    }

    public function set(string $group, string $key, mixed $value, string $type = 'string', bool $encrypted = false): PlatformSetting
    {
        $setting = PlatformSetting::firstOrNew(['key' => $key]);
        $setting->fill(compact('group', 'type') + ['is_encrypted' => $encrypted]);
        $setting->value = $value;
        $setting->save();

        return $setting;
    }
}
