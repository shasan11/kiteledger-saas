<?php

namespace Database\Seeders;

use App\Models\Central\PaymentGateway;
use Illuminate\Database\Seeder;

class PaymentGatewaySeeder extends Seeder
{
    public function run(): void
    {
        PaymentGateway::firstOrCreate(['slug' => 'manual'], [
            'name' => 'Manual Payment', 'mode' => 'live', 'is_active' => true,
            'supported_currencies' => [env('SAAS_BILLING_CURRENCY', 'USD')], 'sort_order' => 0,
            'config' => [
                'methods' => ['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'],
                'instructions' => 'Use the reference supplied by your administrator.',
                'proof_required' => false, 'admin_approval' => true,
            ],
        ]);

        foreach (['stripe' => 'Stripe', 'paypal' => 'PayPal', 'razorpay' => 'Razorpay'] as $slug => $name) {
            PaymentGateway::firstOrCreate(['slug' => $slug], [
                'name' => $name, 'mode' => 'sandbox', 'is_active' => false,
                'supported_currencies' => [env('SAAS_BILLING_CURRENCY', 'USD')], 'sort_order' => 10,
            ]);
        }
    }
}
