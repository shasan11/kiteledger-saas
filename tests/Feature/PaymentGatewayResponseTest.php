<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Gateways\PayPalGateway;
use App\Services\Payments\Gateways\StripeGateway;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentGatewayResponseTest extends TestCase
{
    public function test_stripe_surfaces_the_provider_error_instead_of_reading_a_missing_url(): void
    {
        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'error' => ['message' => 'Invalid API Key provided'],
            ], 401),
        ]);

        $gateway = new StripeGateway($this->gatewaySetting('stripe', [
            'secret_key' => 'sk_test_invalid',
        ]));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Stripe error: Invalid API Key provided');

        $gateway->createPayment($this->invoice(), $this->paymentPayload());
    }

    public function test_stripe_rejects_a_success_response_without_a_checkout_url(): void
    {
        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_test_123',
            ]),
        ]);

        $gateway = new StripeGateway($this->gatewaySetting('stripe', [
            'secret_key' => 'sk_test_valid',
        ]));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Stripe did not return a valid Checkout Session.');

        $gateway->createPayment($this->invoice(), $this->paymentPayload());
    }

    public function test_paypal_reports_sandbox_credential_rejection_details(): void
    {
        Http::fake([
            'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
                'error' => 'invalid_client',
                'error_description' => 'Client Authentication failed',
            ], 401),
        ]);

        $gateway = new PayPalGateway($this->gatewaySetting('paypal', [
            'client_id' => 'sandbox-client',
            'client_secret' => 'invalid-secret',
        ], 'sandbox'));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage(
            'PayPal sandbox authentication failed: Client Authentication failed. Confirm that the credentials belong to the selected mode.'
        );

        $gateway->createPayment($this->invoice(), $this->paymentPayload());
    }

    public function test_paypal_rejects_an_order_without_an_approval_url(): void
    {
        Http::fake([
            'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
                'access_token' => 'access-token',
            ]),
            'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
                'id' => 'ORDER-123',
                'links' => [],
            ]),
        ]);

        $gateway = new PayPalGateway($this->gatewaySetting('paypal', [
            'client_id' => 'sandbox-client',
            'client_secret' => 'sandbox-secret',
        ], 'sandbox'));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('PayPal did not return a valid approval URL.');

        $gateway->createPayment($this->invoice(), $this->paymentPayload());
    }

    public function test_paypal_capture_sends_an_empty_json_object(): void
    {
        Http::fake([
            'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
                'access_token' => 'access-token',
            ]),
            'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-123' => Http::response([
                'id' => 'ORDER-123',
                'status' => 'APPROVED',
            ]),
            'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-123/capture' => Http::response([
                'id' => 'ORDER-123',
                'status' => 'COMPLETED',
                'purchase_units' => [[
                    'payments' => [
                        'captures' => [[
                            'id' => 'CAPTURE-123',
                            'status' => 'COMPLETED',
                            'amount' => [
                                'value' => '100.00',
                                'currency_code' => 'USD',
                            ],
                        ]],
                    ],
                ]],
            ]),
        ]);

        $gateway = new PayPalGateway($this->gatewaySetting('paypal', [
            'client_id' => 'sandbox-client',
            'client_secret' => 'sandbox-secret',
        ], 'sandbox'));

        $result = $gateway->verifyPayment(['order_id' => 'ORDER-123']);

        $this->assertTrue($result['success']);
        $this->assertSame('CAPTURE-123', $result['payment_id']);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-123/capture'
                && $request->body() === '{}';
        });
    }

    private function gatewaySetting(string $provider, array $credentials, string $mode = 'test'): PaymentGatewaySetting
    {
        $setting = new PaymentGatewaySetting([
            'provider' => $provider,
            'mode' => $mode,
            'enabled' => true,
            'active' => true,
        ]);
        $setting->setCredentials($credentials);

        return $setting;
    }

    private function invoice(): Invoice
    {
        return new Invoice([
            'invoice_no' => 'INV-TEST',
            'total' => 100,
            'balance_due' => 100,
        ]);
    }

    private function paymentPayload(): array
    {
        return [
            'amount' => 100,
            'currency' => 'USD',
            'public_token' => 'public-token',
            'company_name' => 'KiteLedger',
            'success_url' => 'https://example.test/pay/success',
            'cancel_url' => 'https://example.test/pay/cancel',
        ];
    }
}
