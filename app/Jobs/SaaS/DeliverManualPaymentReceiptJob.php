<?php

namespace App\Jobs\SaaS;

use App\Models\Central\PaymentTransaction;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class DeliverManualPaymentReceiptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $paymentId)
    {
        $this->onConnection('central')->onQueue('default')->afterCommit();
    }

    public function handle(PlatformSettingsService $settings): void
    {
        $settings->applyMailConfiguration();
        $payment = PaymentTransaction::with('invoice.tenant')->findOrFail($this->paymentId);
        $recipient = $payment->invoice?->tenant?->owner_email;
        if (blank($recipient)) {
            return;
        }
        $invoice = $payment->invoice;
        Mail::html(view('central.payment-receipt-email', compact('payment', 'invoice'))->render(), fn ($mail) => $mail->to($recipient)->subject('Payment receipt · '.$invoice->invoice_number));
        $payment->update(['receipt_sent' => true]);
    }
}
