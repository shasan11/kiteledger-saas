<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\InvoicePaymentLink;
use App\Models\OnlinePayment;
use App\Models\OnlinePaymentSetting;
use App\Models\PaymentGatewaySetting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use App\Services\Payments\OnlineInvoicePaymentService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PublicInvoicePaymentTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('gatewayProviders')]
    public function test_each_gateway_receives_payment_identity_in_return_urls(string $provider): void
    {
        [$invoice, $link] = $this->invoiceWithPaymentLink();

        OnlinePaymentSetting::create([
            'enable_online_payment' => true,
            'allow_public_invoice_payment' => true,
            'allow_partial_invoice_payment' => false,
            'allow_invoice_overpayment' => false,
            'active' => true,
        ]);

        PaymentGatewaySetting::create([
            'provider' => $provider,
            'enabled' => true,
            'active' => true,
            'allowed_currencies' => ['USD'],
        ]);

        $capturedPayload = null;
        $gateway = Mockery::mock(PaymentGatewayInterface::class);
        $gateway->shouldReceive('createPayment')
            ->once()
            ->andReturnUsing(function (Invoice $gatewayInvoice, array $payload) use ($invoice, &$capturedPayload, $provider) {
                $this->assertSame($invoice->id, $gatewayInvoice->id);
                $capturedPayload = $payload;

                return [
                    'redirect_url' => "https://checkout.example/{$provider}",
                    'provider_order_id' => "order-{$provider}",
                    'checkout_mode' => $provider === 'razorpay' ? 'razorpay_js' : 'redirect',
                ];
            });

        $manager = Mockery::mock(PaymentGatewayManager::class);
        $manager->shouldReceive('driver')->once()->with($provider)->andReturn($gateway);
        $this->app->instance(PaymentGatewayManager::class, $manager);

        $paymentService = Mockery::mock(OnlineInvoicePaymentService::class);
        $paymentService->shouldReceive('validatePaymentAmount')->once();
        $paymentService->shouldReceive('createPendingPayment')
            ->once()
            ->andReturnUsing(function (Invoice $paymentInvoice, string $paymentProvider, float $amount, string $token) {
                return OnlinePayment::create([
                    'invoice_id' => $paymentInvoice->id,
                    'provider' => $paymentProvider,
                    'public_token' => $token,
                    'amount' => $amount,
                    'currency_code' => 'USD',
                    'status' => OnlinePayment::STATUS_PENDING,
                    'active' => true,
                ]);
            });
        $this->app->instance(OnlineInvoicePaymentService::class, $paymentService);

        $response = $this->postJson("/api/public/invoices/{$link->public_token}/create-payment", [
            'provider' => $provider,
            'amount' => 100,
        ]);
        $this->assertSame(200, $response->status(), $response->getContent());

        $paymentId = $response->json('online_payment_id');
        $this->assertNotNull($capturedPayload);
        $this->assertReturnUrlContainsPayment(
            $capturedPayload['success_url'],
            $paymentId,
            $provider,
            $link->public_token,
            'success'
        );
        $this->assertReturnUrlContainsPayment(
            $capturedPayload['cancel_url'],
            $paymentId,
            $provider,
            $link->public_token,
            'cancel'
        );
    }

    public static function gatewayProviders(): array
    {
        return [
            'Stripe' => ['stripe'],
            'PayPal' => ['paypal'],
            'Razorpay' => ['razorpay'],
        ];
    }

    public function test_verify_rejects_a_provider_that_does_not_match_the_payment(): void
    {
        [, $link] = $this->invoiceWithPaymentLink();

        $payment = OnlinePayment::create([
            'invoice_id' => $link->invoice_id,
            'provider' => 'paypal',
            'public_token' => $link->public_token,
            'amount' => 100,
            'currency_code' => 'USD',
            'status' => OnlinePayment::STATUS_PROCESSING,
            'active' => true,
        ]);

        $this->postJson("/api/public/invoices/{$link->public_token}/verify-payment", [
            'online_payment_id' => $payment->id,
            'provider' => 'stripe',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Payment provider does not match this payment.');
    }

    private function invoiceWithPaymentLink(): array
    {
        $contactId = (string) Str::uuid();
        DB::table('contacts')->insert([
            'id' => $contactId,
            'name' => 'Online Payment Customer',
            'code' => 'ONLINE-' . Str::random(8),
            'contact_type' => 'customer',
            'active' => true,
            'is_system_generated' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $invoiceId = (string) Str::uuid();
        DB::table('invoices')->insert([
            'id' => $invoiceId,
            'invoice_no' => 'INV-' . Str::random(10),
            'invoice_date' => now()->toDateString(),
            'contact_id' => $contactId,
            'status' => 'posted',
            'active' => true,
            'approved' => true,
            'void' => false,
            'exchange_rate' => 1,
            'total' => 100,
            'paid_total' => 0,
            'balance_due' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $invoice = Invoice::findOrFail($invoiceId);

        $link = InvoicePaymentLink::create([
            'invoice_id' => $invoice->id,
            'public_token' => InvoicePaymentLink::generateToken(),
            'active' => true,
        ]);

        return [$invoice, $link];
    }

    private function assertReturnUrlContainsPayment(
        string $url,
        string $paymentId,
        string $provider,
        string $publicToken,
        string $routeSuffix
    ): void {
        $this->assertSame(
            url("/pay/invoice/{$publicToken}/{$routeSuffix}"),
            strtok($url, '?')
        );

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame($paymentId, $query['online_payment_id'] ?? null);
        $this->assertSame($provider, $query['provider'] ?? null);
    }
}
