<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\Payments\OnlineInvoicePaymentService;
use Illuminate\Http\Request;

class InvoicePaymentLinkController extends Controller
{
    public function __construct(protected OnlineInvoicePaymentService $service) {}

    public function show(Request $request, string $invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);
        $link = $invoice->paymentLink;

        if (!$link) {
            return response()->json(['link' => null, 'public_url' => null]);
        }

        return response()->json([
            'link' => [
                'id' => $link->id,
                'public_token' => $link->public_token,
                'active' => $link->active,
                'expires_at' => $link->expires_at?->toISOString(),
                'last_accessed_at' => $link->last_accessed_at?->toISOString(),
                'is_expired' => $link->isExpired(),
                'is_usable' => $link->isUsable(),
            ],
            'public_url' => $link->isUsable() ? url('/pay/invoice/' . $link->public_token) : null,
        ]);
    }

    public function generate(Request $request, string $invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);

        if ((bool) $invoice->void || $invoice->status === 'void') {
            return response()->json(['message' => 'Cannot create a payment link for a voided invoice.'], 422);
        }

        $link = $this->service->generatePaymentLink($invoice);

        return response()->json([
            'link' => [
                'id' => $link->id,
                'public_token' => $link->public_token,
                'active' => $link->active,
                'expires_at' => $link->expires_at?->toISOString(),
                'last_accessed_at' => $link->last_accessed_at?->toISOString(),
                'is_expired' => $link->isExpired(),
                'is_usable' => $link->isUsable(),
            ],
            'public_url' => url('/pay/invoice/' . $link->public_token),
        ], 201);
    }

    public function disable(Request $request, string $invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);
        $this->service->disablePaymentLink($invoice);

        return response()->json(['message' => 'Payment link disabled.']);
    }
}
