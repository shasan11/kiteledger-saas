<?php

namespace App\Observers;

use App\Models\Invoice;
use App\Services\Inventory\InvoiceStockPostingService;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;
use Illuminate\Support\Facades\DB;

class InvoiceObserver
{
    private static bool $postingStock = false;

    public function __construct(
        protected TransactionApprovalService $approvalService,
        protected TransactionVoidService $voidService,
        protected InvoiceStockPostingService $invoiceStockService,
    ) {
    }

    public function updated(Invoice $invoice): void
    {
        if ($invoice->wasChanged('approved') && (bool) $invoice->approved === true) {
            $this->approvalService->handleApprovedTransition($invoice);

            // Safety-net: post warehouse stock after the transaction commits so
            // that all child lines are guaranteed persisted. The service is
            // idempotent, so this is a no-op if approve() already ran it.
            DB::connection()->afterCommit(function () use ($invoice) {
                if (static::$postingStock) {
                    return;
                }

                $fresh = $invoice->fresh();
                if (!$fresh || !(bool) $fresh->approved || (bool) ($fresh->void ?? false)) {
                    return;
                }

                static::$postingStock = true;
                try {
                    app(InvoiceStockPostingService::class)->post($fresh);
                } finally {
                    static::$postingStock = false;
                }
            });
        }

        if ($invoice->wasChanged('void') && (bool) $invoice->void === true) {
            $this->voidService->void($invoice, $invoice->voided_reason ?? 'Voided');
        }

        if ($invoice->wasChanged('status') && in_array($invoice->status, ['cancelled', 'void'], true)) {
            $this->voidService->cancel($invoice, $invoice->voided_reason ?? 'Cancelled');
        }
    }
}
