<?php

namespace App\Jobs\SaaS;

use App\Models\Central\TenantInvoice;
use App\Services\SaaS\PlatformSettingsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class DeliverTenantInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $invoiceId)
    {
        $this->onConnection('central')->onQueue('default')->afterCommit();
    }

    public function handle(PlatformSettingsService $settings): void
    {
        $settings->applyMailConfiguration();
        $invoice = TenantInvoice::with(['tenant', 'lines'])->findOrFail($this->invoiceId);
        abort_if(blank($invoice->tenant?->owner_email), 422, 'The tenant owner does not have an email address.');
        $pdf = Pdf::loadView('central.invoice', compact('invoice'))->setPaper('a4')->output();
        Mail::html(view('central.invoice-email-preview', compact('invoice'))->render(), fn ($mail) => $mail->to($invoice->tenant->owner_email)->subject('Invoice '.$invoice->invoice_number)->attachData($pdf, $invoice->invoice_number.'.pdf', ['mime' => 'application/pdf']));
    }
}
