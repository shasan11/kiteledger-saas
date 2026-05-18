<?php

namespace App\Observers;

use App\Models\PurchaseBill;
use App\Models\SupplierPaymentLine;

class SupplierPaymentLineObserver
{
    private array $originalBillIds = [];

    public function updating(SupplierPaymentLine $line): void
    {
        if ($line->isDirty('purchase_bill_id')) {
            $this->originalBillIds[$line->getKey()] = $line->getOriginal('purchase_bill_id');
        }
    }

    public function saved(SupplierPaymentLine $line): void
    {
        PurchaseBill::recalculatePaymentTotalsForIds([
            $this->originalBillIds[$line->getKey()] ?? null,
            $line->purchase_bill_id,
        ]);
        unset($this->originalBillIds[$line->getKey()]);
    }

    public function deleted(SupplierPaymentLine $line): void
    {
        PurchaseBill::recalculatePaymentTotalsForIds([$line->purchase_bill_id]);
    }
}
