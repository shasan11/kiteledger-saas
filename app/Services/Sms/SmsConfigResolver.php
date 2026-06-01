<?php

namespace App\Services\Sms;

use App\Models\SmsConfig;

class SmsConfigResolver
{
    public function activeDefault(?string $provider = null, ?string $configId = null): ?SmsConfig
    {
        $query = SmsConfig::query()
            ->where(function ($query) {
                $query->where('is_active', true)->orWhere('active', true);
            });

        if ($configId) {
            return (clone $query)->whereKey($configId)->first();
        }

        if ($provider) {
            $providerConfig = (clone $query)
                ->where('provider', $provider)
                ->orderByDesc('is_default')
                ->orderBy('created_at')
                ->first();

            if ($providerConfig) {
                return $providerConfig;
            }
        }

        return $query
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->first();
    }

    public function byProvider(string $provider): ?SmsConfig
    {
        return $this->activeDefault($provider);
    }

    public function missingProviderMessage(): string
    {
        return 'SMS provider is not configured.';
    }
}
