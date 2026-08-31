<?php

namespace App\Models\Central;

use Illuminate\Support\Facades\Crypt;

class PlatformSetting extends CentralModel
{
    protected $hidden = ['value'];

    public function getValueAttribute(?string $value): mixed
    {
        if ($this->is_encrypted && $value) {
            $value = Crypt::decryptString($value);
        }

        return match ($this->type) {
            'boolean' => (bool) filter_var($value, FILTER_VALIDATE_BOOL),
            'integer' => (int) $value,
            'decimal' => (float) $value,
            'json' => json_decode($value ?? 'null', true),
            default => $value,
        };
    }

    public function setValueAttribute(mixed $value): void
    {
        $encoded = is_array($value) ? json_encode($value) : (string) $value;
        $this->attributes['value'] = $this->is_encrypted ? Crypt::encryptString($encoded) : $encoded;
    }

    protected function casts(): array
    {
        return [
            'is_encrypted' => 'boolean', 'is_public' => 'boolean', 'options' => 'array',
            'is_required' => 'boolean', 'is_readonly' => 'boolean', 'requires_restart' => 'boolean',
            'requires_confirmation' => 'boolean', 'last_tested_at' => 'datetime',
        ];
    }

    public function safeValue(): mixed
    {
        return $this->is_encrypted ? null : $this->value;
    }

    public function revisions()
    {
        return $this->hasMany(PlatformSettingRevision::class, 'setting_id')->latest('id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(CentralAdmin::class, 'updated_by');
    }
}
