<?php

namespace App\Services\Payments;

use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use App\Services\Payments\Gateways\EsewaGateway;
use App\Services\Payments\Gateways\KhaltiGateway;
use App\Services\Payments\Gateways\PayPalGateway;
use App\Services\Payments\Gateways\RazorpayGateway;
use App\Services\Payments\Gateways\StripeGateway;

class PaymentGatewayManager
{
    protected array $driverMap = [
        'stripe' => StripeGateway::class,
        'paypal' => PayPalGateway::class,
        'razorpay' => RazorpayGateway::class,
        'khalti' => KhaltiGateway::class,
        'esewa' => EsewaGateway::class,
    ];

    public function driver(string $provider): PaymentGatewayInterface
    {
        $setting = PaymentGatewaySetting::forProvider($provider);

        if (!$setting) {
            throw new \RuntimeException("Payment gateway '{$provider}' is not configured.");
        }

        if (!$setting->enabled) {
            throw new \RuntimeException("Payment gateway '{$provider}' is not enabled.");
        }

        $driverClass = $this->driverMap[$provider] ?? null;

        if (!$driverClass) {
            throw new \RuntimeException("Payment gateway driver '{$provider}' is not supported.");
        }

        return new $driverClass($setting);
    }

    public function enabledDrivers(): array
    {
        return PaymentGatewaySetting::allEnabled()
            ->filter(fn ($s) => isset($this->driverMap[$s->provider]))
            ->mapWithKeys(fn ($s) => [$s->provider => new ($this->driverMap[$s->provider])($s)])
            ->toArray();
    }

    public function supportedProviders(): array
    {
        return array_keys($this->driverMap);
    }

    public function providerInfo(): array
    {
        $infos = [];
        foreach ($this->driverMap as $provider => $class) {
            $setting = PaymentGatewaySetting::forProvider($provider);
            $infos[$provider] = [
                'provider' => $provider,
                'display_name' => $setting?->display_name ?? ucfirst($provider),
                'enabled' => $setting?->enabled ?? false,
                'mode' => $setting?->mode ?? 'test',
                'configured' => $setting && count($setting->getCredentials()) > 0,
                'supported_currencies' => $setting?->allowed_currencies ?? [],
                'default_currency' => $setting?->default_currency,
                'webhook_enabled' => $setting?->webhook_enabled ?? false,
            ];
        }
        return $infos;
    }
}
