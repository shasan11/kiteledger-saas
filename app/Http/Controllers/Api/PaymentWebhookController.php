<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentWebhookService;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(protected PaymentWebhookService $webhookService) {}

    public function handle(Request $request, string $provider)
    {
        $supportedProviders = ['stripe', 'paypal', 'razorpay', 'khalti', 'esewa'];

        if (!in_array($provider, $supportedProviders, true)) {
            return response()->json(['message' => 'Unknown provider.'], 404);
        }

        try {
            $result = $this->webhookService->handle($provider, $request);
            return response()->json($result);
        } catch (\RuntimeException $e) {
            // Return 400 for signature verification failures so provider stops retrying
            return response()->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Webhook processing error.'], 500);
        }
    }
}
