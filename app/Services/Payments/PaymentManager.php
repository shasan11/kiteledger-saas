<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentGatewayInterface;
use App\Models\Central\PaymentGateway;

class PaymentManager
{
    public function driver(string $slug): PaymentGatewayInterface
    {
        if ($slug === 'manual') {
            return app(ManualPaymentService::class);
        }
        $settings = PaymentGateway::where('slug', $slug)->where('is_active', true)->firstOrFail();

        return match ($slug) {
            'stripe' => new StripeGatewayService($settings),'paypal' => new PayPalGatewayService($settings),'razorpay' => new RazorpayGatewayService($settings),default => throw new \InvalidArgumentException("Unsupported payment gateway: {$slug}")
        };
    }
}
