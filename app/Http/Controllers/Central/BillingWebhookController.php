<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Jobs\SaaS\ProcessBillingWebhookJob;
use App\Models\Central\BillingWebhookEvent;
use App\Services\Payments\PaymentManager;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BillingWebhookController extends Controller
{
    public function __invoke(Request $request, string $gateway, PaymentManager $payments)
    {
        abort_unless(in_array($gateway, ['stripe', 'paypal', 'razorpay'], true), 404);
        $payload = $request->json()->all();
        $headers = collect($request->headers->all())->map(fn ($value) => is_array($value) ? ($value[0] ?? '') : $value)->all();
        $headers['raw_body'] = $request->getContent();
        if (! $payments->driver($gateway)->verifyWebhook($payload, $headers)) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $eventId = (string) ($payload['id'] ?? data_get($payload, 'payload.payment.entity.id') ?? Str::uuid());
        $event = BillingWebhookEvent::firstOrCreate(['event_id' => $gateway.':'.$eventId], [
            'gateway' => $gateway, 'event_type' => (string) ($payload['type'] ?? $payload['event'] ?? $payload['event_type'] ?? 'unknown'),
            'payload' => $this->sanitize($payload), 'status' => 'pending',
        ]);
        if ($event->wasRecentlyCreated) {
            dispatch((new ProcessBillingWebhookJob($event->id))->onConnection('database')->onQueue('billing'));
        }

        return response()->json(['received' => true], $event->wasRecentlyCreated ? 202 : 200);
    }

    private function sanitize(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if (preg_match('/secret|password|authorization|card_number|cvv|cvc/i', (string) $key)) {
                $payload[$key] = '[redacted]';

                continue;
            }
            if (is_array($value)) {
                $payload[$key] = $this->sanitize($value);
            }
        }

        return $payload;
    }
}
