<?php

namespace App\Services\SaaS;

use App\Models\Central\TenantInvoice;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;

class InvoiceQrCode
{
    public function dataUri(TenantInvoice $invoice): ?string
    {
        if (! data_get($invoice->customization_snapshot, 'invoice_customization.qr_code', false)) {
            return null;
        }

        $payload = data_get($invoice->metadata, 'payment_url') ?: sprintf(
            'kiteledger:invoice?number=%s&currency=%s&total=%.2f&balance=%.2f&due=%s',
            rawurlencode((string) $invoice->invoice_number),
            rawurlencode((string) $invoice->currency),
            (float) $invoice->total,
            (float) $invoice->balance,
            optional($invoice->due_date)->format('Y-m-d') ?? ''
        );

        return (new Builder(
            writer: new PngWriter,
            data: $payload,
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 220,
            margin: 8,
        ))->build()->getDataUri();
    }
}
