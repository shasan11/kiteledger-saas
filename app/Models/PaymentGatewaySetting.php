<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class PaymentGatewaySetting extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'provider',
        'enabled',
        'mode',
        'display_name',
        'public_config',
        'encrypted_credentials',
        'allowed_currencies',
        'default_currency',
        'webhook_enabled',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'webhook_enabled' => 'boolean',
            'active' => 'boolean',
            'public_config' => 'array',
            'allowed_currencies' => 'array',
        ];
    }

    public static function forProvider(string $provider): ?self
    {
        return static::query()->where('provider', $provider)->first();
    }

    public static function allEnabled(): \Illuminate\Database\Eloquent\Collection
    {
        return static::query()
            ->where('enabled', true)
            ->where('active', true)
            ->get();
    }

    public function getCredentials(): array
    {
        if (!$this->encrypted_credentials) {
            return [];
        }
        try {
            return json_decode(Crypt::decryptString($this->encrypted_credentials), true) ?? [];
        } catch (\Throwable) {
            return [];
        }
    }

    public function setCredentials(array $credentials): void
    {
        $this->encrypted_credentials = Crypt::encryptString(json_encode($credentials));
    }

    public function getCredential(string $key, mixed $default = null): mixed
    {
        return $this->getCredentials()[$key] ?? $default;
    }

    public function maskCredential(string $value): string
    {
        if (strlen($value) <= 8) {
            return str_repeat('*', strlen($value));
        }
        return substr($value, 0, 4) . str_repeat('*', max(0, strlen($value) - 8)) . substr($value, -4);
    }
}
