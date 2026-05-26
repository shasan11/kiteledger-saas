<?php

namespace App\Services\Pos;

use App\Models\CustomerPayment;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\SalesReturn;
use App\Services\TransactionApprovalService;

class PosAccountingService
{
    public function __construct(
        protected TransactionApprovalService $approvalService,
    ) {
    }

    public function approveSaleArtifacts(PosSale $sale): void
    {
        if (!$sale->approved) {
            return;
        }

        $sale->loadMissing([
            'invoice.contact',
            'invoice.invoiceLines.product',
            'invoice.invoiceLines.taxRate',
            'customerPayment.contact',
            'customerPayment.account',
        ]);

        if ($sale->invoice && !$sale->invoice->approved) {
            $this->approvalService->approve($sale->invoice, $sale->approved_by_id);
        }

        if ($sale->customerPayment && !$sale->customerPayment->approved) {
            $this->approvalService->approve($sale->customerPayment, $sale->approved_by_id);
        }
    }

    public function approveReturnArtifacts(PosReturn $return): void
    {
        if (!$return->approved) {
            return;
        }

        if ($return->salesReturn && !$return->salesReturn->approved) {
            $this->approvalService->approve($return->salesReturn, $return->approved_by_id);
        }
    }
}
