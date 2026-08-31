<?php

namespace Database\Seeders;

use App\Models\Central\PaymentGateway;
use Illuminate\Database\Seeder;

class PaymentGatewaySeeder extends Seeder
{
    /**
     * Currencies each provider settles in, so a freshly installed platform can
     * bill in something other than USD without an administrator first having to
     * work out why every gateway silently disappeared from the checkout.
     *
     * These are the widely supported presentment currencies, not the provider's
     * exhaustive list — administrators can edit them under Billing → Gateways.
     */
    private const CURRENCIES = [
        'stripe' => ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'INR', 'AED', 'SAR', 'MYR', 'MXN', 'BRL', 'ZAR'],
        'paypal' => ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'MXN', 'BRL', 'ILS', 'PHP', 'THB', 'TWD'],
        'razorpay' => ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'AUD', 'CAD', 'MYR'],
    ];

    public function run(): void
    {
        $billingCurrency = strtoupper((string) env('SAAS_BILLING_CURRENCY', 'USD'));

        PaymentGateway::firstOrCreate(['slug' => 'manual'], [
            'name' => 'Manual Payment', 'mode' => 'live', 'is_active' => true,
            // Manual settlement is currency-agnostic: whatever the platform bills in.
            'supported_currencies' => [$billingCurrency], 'sort_order' => 0,
            'config' => [
                'methods' => ['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'],
                'instructions' => 'Use the reference supplied by your administrator.',
                'proof_required' => false, 'admin_approval' => true,
            ],
        ]);

        foreach (['stripe' => 'Stripe', 'paypal' => 'PayPal', 'razorpay' => 'Razorpay'] as $slug => $name) {
            // The billing currency is prepended so the platform's own currency
            // is always offered, even if it is outside the list above.
            $currencies = array_values(array_unique(array_merge([$billingCurrency], self::CURRENCIES[$slug])));

            $gateway = PaymentGateway::firstOrCreate(['slug' => $slug], [
                'name' => $name, 'mode' => 'sandbox', 'is_active' => false,
                'supported_currencies' => $currencies, 'sort_order' => 10,
            ]);

            // Installs seeded before this list existed carry a single currency.
            // Widen those, but never a gateway an administrator has switched on.
            if (! $gateway->is_active && count($gateway->supported_currencies ?? []) <= 1) {
                $gateway->update(['supported_currencies' => $currencies]);
            }
        }
    }
}
