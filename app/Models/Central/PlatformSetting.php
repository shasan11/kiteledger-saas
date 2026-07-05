<?php

namespace App\Models\Central;

use Illuminate\Support\Facades\Crypt;

class PlatformSetting extends CentralModel
{
    public function getValueAttribute(?string $value): mixed
    {
        if ($this->is_encrypted && $value) {
            $value = Crypt::decryptString($value);
        }

        return match ($this->type) {
            'boolean' => (bool) filter_var($value, FILTER_VALIDATE_BOOL),'integer' => (int) $value,'json' => json_decode($value ?? 'null', true),default => $value
        };
    }

    public function setValueAttribute(mixed $value): void
    {
        $encoded = is_array($value) ? json_encode($value) : (string) $value;
        $this->attributes['value'] = $this->is_encrypted ? Crypt::encryptString($encoded) : $encoded;
    }

    protected function casts(): array
    {
        return ['is_encrypted' => 'boolean', 'is_public' => 'boolean'];
    }
}
