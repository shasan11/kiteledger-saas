<?php

namespace App\Models\Central;

class PaymentGateway extends CentralModel
{
    protected $hidden = ['secret_key', 'webhook_secret', 'config'];

    protected $appends = ['safe_config', 'has_secret_key', 'has_webhook_secret'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'secret_key' => 'encrypted', 'webhook_secret' => 'encrypted', 'supported_currencies' => 'array', 'config' => 'encrypted:array', 'last_tested_at' => 'datetime'];
    }

    public function getSafeConfigAttribute(): array
    {
        return $this->maskConfig($this->config ?? []);
    }

    public function getHasSecretKeyAttribute(): bool
    {
        return filled($this->getRawOriginal('secret_key'));
    }

    public function getHasWebhookSecretAttribute(): bool
    {
        return filled($this->getRawOriginal('webhook_secret'));
    }

    private function maskConfig(array $config): array
    {
        foreach ($config as $key => $value) {
            if (preg_match('/secret|password|token|private.?key|api.?key|credential/i', (string) $key)) {
                unset($config[$key]);
            } elseif (is_array($value)) {
                $config[$key] = $this->maskConfig($value);
            }
        }

        return $config;
    }
}
